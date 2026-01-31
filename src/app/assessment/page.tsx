"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layouts";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const STORAGE_KEY = "assessment_answers";

const ASSESSMENT_STEPS = [
  {
    id: 1,
    title: "Business Overview",
    description: "Tell us about your business basics",
    questions: [
      { id: "business_type", label: "What type of business do you run?", options: ["Service", "Product", "Hybrid", "Other"] },
      { id: "years_in_business", label: "How long have you been in business?", options: ["< 1 year", "1-3 years", "3-5 years", "5+ years"] },
      { id: "team_size", label: "What is your team size?", options: ["Solo", "2-5", "6-20", "20+"] },
    ],
  },
  {
    id: 2,
    title: "Revenue & Growth",
    description: "Your current revenue and growth trajectory",
    questions: [
      { id: "monthly_revenue", label: "What is your monthly revenue?", options: ["< $10k", "$10k-$50k", "$50k-$100k", "$100k+"] },
      { id: "growth_rate", label: "What is your growth rate?", options: ["Declining", "Flat", "10-30%", "30%+"] },
      { id: "revenue_goal", label: "What is your revenue goal?", options: ["Stability", "2x growth", "5x growth", "10x+ growth"] },
    ],
  },
  {
    id: 3,
    title: "Operations",
    description: "How your business operates day-to-day",
    questions: [
      { id: "bottleneck", label: "What is your biggest bottleneck?", options: ["Sales", "Delivery", "Hiring", "Systems"] },
      { id: "automation", label: "How automated are your processes?", options: ["Manual", "Some automation", "Mostly automated", "Fully automated"] },
      { id: "hours_worked", label: "Hours you work per week?", options: ["< 40", "40-50", "50-60", "60+"] },
    ],
  },
  {
    id: 4,
    title: "Marketing & Sales",
    description: "Your customer acquisition strategies",
    questions: [
      { id: "lead_source", label: "Primary lead source?", options: ["Referrals", "Paid ads", "Organic/SEO", "Outbound"] },
      { id: "conversion_rate", label: "Lead to customer conversion?", options: ["< 10%", "10-25%", "25-50%", "50%+"] },
      { id: "sales_cycle", label: "Average sales cycle length?", options: ["< 1 week", "1-4 weeks", "1-3 months", "3+ months"] },
    ],
  },
  {
    id: 5,
    title: "Team & Leadership",
    description: "Your team structure and management",
    questions: [
      { id: "delegation", label: "How much do you delegate?", options: ["Nothing", "Some tasks", "Most tasks", "Everything"] },
      { id: "hiring_challenge", label: "Biggest hiring challenge?", options: ["Finding talent", "Affording talent", "Retaining talent", "No challenges"] },
      { id: "leadership_time", label: "Time spent on leadership?", options: ["< 10%", "10-25%", "25-50%", "50%+"] },
    ],
  },
];

type Answers = Record<string, string>;

export default function AssessmentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const totalSteps = ASSESSMENT_STEPS.length;

  // Load answers from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAnswers(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save answers to sessionStorage whenever they change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    }
  }, [answers]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - navigate to lead gate
      router.push("/lead-gate");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = ASSESSMENT_STEPS.find((step) => step.id === currentStep);

  // Check if all questions in current step are answered
  const currentStepComplete = currentStepData?.questions.every(
    (q) => answers[q.id]
  ) ?? false;

  return (
    <div className="min-h-screen">
      <Header variant="public" />

      <main className="container mx-auto max-w-3xl px-4 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="mb-8 flex justify-center gap-2">
          {ASSESSMENT_STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step.id < currentStep
                  ? "bg-primary text-primary-foreground"
                  : step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step.id < currentStep ? <Check className="h-4 w-4" /> : step.id}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{currentStepData?.title}</CardTitle>
            <p className="text-muted-foreground">{currentStepData?.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {currentStepData?.questions.map((question) => (
                <div key={question.id} className="rounded-lg border p-4">
                  <p className="mb-3 font-medium">{question.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleAnswer(question.id, option)}
                        className={`rounded border p-2 text-sm transition-colors ${
                          answers[question.id] === option
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button onClick={handleNext} disabled={!currentStepComplete}>
            {currentStep === totalSteps ? "Continue to Results" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
