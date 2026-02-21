"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { Plus, Mic, MicOff, CheckSquare, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { getProjects } from "@/lib/api/projects";
import { createTodo } from "@/lib/api/todos";
import { createTimesheetEntry } from "@/lib/api/timesheet";
import { updateOnboardingStep } from "@/lib/api/onboarding";
import { format } from "date-fns";
import type { Project } from "@/lib/db/schema";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as Record<string, new () => SpeechRecognitionInstance>)
      .SpeechRecognition ||
    (window as unknown as Record<string, new () => SpeechRecognitionInstance>)
      .webkitSpeechRecognition ||
    null
  );
}

type Step = "select" | "record" | "parsing" | "details";
type CaptureType = "todo" | "timesheet" | null;

export function QuickCaptureButton() {
  const { data: session } = useSession();
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [captureType, setCaptureType] = useState<CaptureType>(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);

  // Todo form state
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDescription, setTodoDescription] = useState("");
  const [todoProjectId, setTodoProjectId] = useState("");

  // Timesheet form state
  const [tsDescription, setTsDescription] = useState("");
  const [tsDate, setTsDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tsProjectName, setTsProjectName] = useState("");
  const [tsHours, setTsHours] = useState("1");
  const [tsNotes, setTsNotes] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = session?.user?.id;
  const workspaceId = currentWorkspace?.id;

  // Fetch projects when dialog opens
  useEffect(() => {
    if (open && workspaceId && userId) {
      getProjects(workspaceId, userId)
        .then(setProjects)
        .catch(() => setProjects([]));
    }
  }, [open, workspaceId, userId]);

  const resetState = useCallback(() => {
    setStep("select");
    setCaptureType(null);
    setTranscribedText("");
    setIsRecording(false);
    setRecordingTime(0);
    setSaving(false);
    setTodoTitle("");
    setTodoDescription("");
    setTodoProjectId("");
    setTsDescription("");
    setTsDate(format(new Date(), "yyyy-MM-dd"));
    setTsProjectName("");
    setTsHours("1");
    setTsNotes("");
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetState();
    setOpen(newOpen);
  };

  const selectType = (type: CaptureType) => {
    setCaptureType(type);
    setStep("record");
  };

  const startRecording = () => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      toast.error("Voice input is not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscribedText(text);
    };

    recognition.onerror = () => {
      stopRecording();
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const advanceAfterRecording = async () => {
    stopRecording();
    const text = transcribedText.trim();

    // If no text (user skipped voice), go straight to details
    if (!text) {
      setStep("details");
      return;
    }

    // Mark onboarding step for voice usage
    if (userId) {
      updateOnboardingStep(userId, "tried_voice").catch(() => {});
    }

    // Show parsing step and call AI
    setStep("parsing");

    try {
      const response = await fetch("/api/ai/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          type: captureType,
          projects: projects.map((p) => ({ name: p.name, id: p.id })),
        }),
      });

      if (!response.ok) throw new Error("Parse failed");

      const result = await response.json();

      if (result.type === "todo" && result.data) {
        setTodoTitle(result.data.title || text);
        setTodoDescription(result.data.description || "");
        if (result.data.project_id) {
          setTodoProjectId(result.data.project_id);
        }
      } else if (result.type === "timesheet" && result.data) {
        setTsDescription(result.data.task_description || text);
        if (result.data.project) {
          // Find project name match for the select
          const matchedProject = projects.find(
            (p) => p.name.toLowerCase() === result.data.project.toLowerCase()
          );
          if (matchedProject) {
            setTsProjectName(matchedProject.name);
          }
        }
        if (result.data.hours) {
          setTsHours(String(result.data.hours));
        }
        if (result.data.date) {
          setTsDate(result.data.date);
        }
        if (result.data.notes) {
          setTsNotes(result.data.notes);
        }
      }
    } catch {
      // Fallback: use raw text
      if (captureType === "todo") {
        setTodoTitle(text);
      } else {
        setTsDescription(text);
      }
    }

    setStep("details");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSaveTodo = async () => {
    if (!workspaceId || !userId || !todoTitle.trim()) return;
    setSaving(true);
    try {
      await createTodo(workspaceId, userId, {
        title: todoTitle.trim(),
        description: todoDescription.trim() || undefined,
        project_id: todoProjectId || null,
      });
      toast.success("Todo created!");
      handleOpenChange(false);
      window.dispatchEvent(new CustomEvent("todo-created"));
      router.push("/todos");
    } catch {
      toast.error("Failed to create todo");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTimesheet = async () => {
    if (
      !workspaceId ||
      !userId ||
      !tsDescription.trim() ||
      !tsProjectName ||
      !tsHours
    )
      return;
    setSaving(true);
    try {
      await createTimesheetEntry(workspaceId, userId, {
        task_description: tsDescription.trim(),
        date: tsDate,
        project_name: tsProjectName,
        hours: parseFloat(tsHours),
        notes: tsNotes.trim() || undefined,
      });
      toast.success("Timesheet entry created!");
      handleOpenChange(false);
      window.dispatchEvent(new CustomEvent("timesheet-created"));
      router.push("/timesheet");
    } catch {
      toast.error("Failed to create timesheet entry");
    } finally {
      setSaving(false);
    }
  };

  // Hide FAB if no workspace or not logged in
  if (!workspaceId || !userId) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg hover:scale-105 transition-transform"
        size="icon-lg"
      >
        <Plus className="size-6" />
        <span className="sr-only">Quick Capture</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          {/* Step 1: Type Selection */}
          {step === "select" && (
            <>
              <DialogHeader>
                <DialogTitle>Quick Capture</DialogTitle>
                <DialogDescription>
                  What would you like to add?
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <button
                  onClick={() => selectType("todo")}
                  className="flex flex-col items-center gap-2 border rounded-lg p-6 cursor-pointer hover:border-primary hover:bg-accent transition text-left"
                >
                  <CheckSquare className="size-8 text-primary" />
                  <span className="font-medium">Todo</span>
                  <span className="text-xs text-muted-foreground">
                    Capture a task
                  </span>
                </button>
                <button
                  onClick={() => selectType("timesheet")}
                  className="flex flex-col items-center gap-2 border rounded-lg p-6 cursor-pointer hover:border-primary hover:bg-accent transition text-left"
                >
                  <Clock className="size-8 text-primary" />
                  <span className="font-medium">Timesheet Entry</span>
                  <span className="text-xs text-muted-foreground">
                    Log your work
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Step 2: Voice Recording */}
          {step === "record" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Record {captureType === "todo" ? "Todo" : "Timesheet Entry"}
                </DialogTitle>
                <DialogDescription>
                  Tap the microphone and speak your{" "}
                  {captureType === "todo" ? "task title" : "task description"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-6">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                  className={`size-16 rounded-full flex items-center justify-center transition ${
                    isRecording ? "bg-red-500 animate-pulse" : "bg-primary"
                  } text-primary-foreground`}
                >
                  {isRecording ? (
                    <MicOff className="size-7" />
                  ) : (
                    <Mic className="size-7" />
                  )}
                </button>

                <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  {isRecording && (
                    <span className="size-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
                  )}
                  <span className="font-mono">{formatTime(recordingTime)}</span>
                  {isRecording && <span className="sr-only">Recording in progress</span>}
                </div>

                {transcribedText && (
                  <p className="text-sm text-muted-foreground text-center px-4 max-h-24 overflow-auto">
                    {transcribedText}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  {(transcribedText || !isRecording) && (
                    <Button onClick={advanceAfterRecording}>
                      {transcribedText ? "Continue" : "Skip voice input"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Step 3: AI Parsing */}
          {step === "parsing" && (
            <>
              <DialogHeader>
                <DialogTitle>AI parsing...</DialogTitle>
                <DialogDescription>
                  Extracting details from your voice input
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  &ldquo;{transcribedText}&rdquo;
                </p>
              </div>
            </>
          )}

          {/* Step 4: Details Form */}
          {step === "details" && captureType === "todo" && (
            <>
              <DialogHeader>
                <DialogTitle>Create Todo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="qc-title">Title</Label>
                  <Input
                    id="qc-title"
                    value={todoTitle}
                    onChange={(e) => setTodoTitle(e.target.value)}
                    placeholder="What needs to be done?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qc-desc">Description (optional)</Label>
                  <Textarea
                    id="qc-desc"
                    value={todoDescription}
                    onChange={(e) => setTodoDescription(e.target.value)}
                    placeholder="Add more details..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project (optional)</Label>
                  <Select
                    value={todoProjectId}
                    onValueChange={setTodoProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTodo}
                  disabled={!todoTitle.trim() || saving}
                >
                  {saving ? "Creating..." : "Create Todo"}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "details" && captureType === "timesheet" && (
            <>
              <DialogHeader>
                <DialogTitle>Create Timesheet Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="qc-task">Task Description</Label>
                  <Input
                    id="qc-task"
                    value={tsDescription}
                    onChange={(e) => setTsDescription(e.target.value)}
                    placeholder="What did you work on?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <DatePicker value={tsDate} onChange={setTsDate} />
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={tsProjectName}
                    onValueChange={setTsProjectName}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qc-hours">Hours</Label>
                  <Input
                    id="qc-hours"
                    type="number"
                    step={0.25}
                    min={0.25}
                    value={tsHours}
                    onChange={(e) => setTsHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qc-notes">Notes (optional)</Label>
                  <Textarea
                    id="qc-notes"
                    value={tsNotes}
                    onChange={(e) => setTsNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTimesheet}
                  disabled={
                    !tsDescription.trim() ||
                    !tsProjectName ||
                    !tsHours ||
                    saving
                  }
                >
                  {saving ? "Creating..." : "Create Entry"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
