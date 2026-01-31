"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layouts";
import { Button, Card, CardContent } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

// ===== Storage =====
const STORAGE_KEY = "assessment_answers_v1";

// ===== Industries (from screenshot) =====
type Industry = {
  id: string;
  title: string;
  subtitle: string;
};

const INDUSTRIES: Industry[] = [
  { id: "produktion_fertigung", title: "Produktion & Fertigung", subtitle: "Maschinenbau, Automotive, Produktion" },
  { id: "finanzdienstleistungen", title: "Finanzdienstleistungen", subtitle: "Banken, Versicherungen, Asset Management" },
  { id: "gesundheitswesen", title: "Gesundheitswesen", subtitle: "Krankenhäuser, Pharma, Medizintechnik" },
  { id: "handel_ecommerce", title: "Handel & E-Commerce", subtitle: "Einzelhandel, Großhandel, Online-Handel" },
  { id: "technologie_software", title: "Technologie & Software", subtitle: "IT-Dienstleister, SaaS, Softwareentwicklung" },
  { id: "professional_services", title: "Professional Services", subtitle: "Beratung, Recht, Wirtschaftsprüfung" },
  { id: "logistik_transport", title: "Logistik & Transport", subtitle: "Spedition, Lagerhaltung, Supply Chain" },
  { id: "energie_versorgung", title: "Energie & Versorgung", subtitle: "Strom, Gas, Wasser, Erneuerbare Energien" },
];

// ===== Assessment content (your 5x4 questions = 20) =====
type DimensionId = "strategie" | "umsetzung" | "people" | "fuehrung" | "governance";

type Question = {
  id: string;
  text: string;
};

type Dimension = {
  id: DimensionId;
  title: string;
  description: string;
  questions: Question[];
};

const DIMENSIONS: Dimension[] = [
  {
    id: "strategie",
    title: "Strategische Klarheit",
    description:
      "Beantwortet, ob strategische Ziele so formuliert sind, dass sie operativ umsetzbar und messbar sind. Diese sollten verstanden und handlungsleitend sein.",
    questions: [
      { id: "strategie_1", text: "Gibt es eine dokumentierte Strategie, die operativ konkret genug ist, um Entscheidungen abzuleiten?" },
      { id: "strategie_2", text: "Können Führungskräfte die drei wichtigsten strategischen Prioritäten konsistent benennen?" },
      { id: "strategie_3", text: "Existieren klare Kriterien, nach denen strategische Initiativen priorisiert oder gestoppt werden?" },
      { id: "strategie_4", text: "Gibt es Strategie-Reviews, die regelmäßig zu Entscheidungen führen?" },
    ],
  },
  {
    id: "umsetzung",
    title: "Umsetzungsfähigkeit",
    description:
      "Beantwortet, ob Strategie in konkrete Maßnahmen übersetzt wird und Fortschritt verbindlich nachverfolgt wird.",
    questions: [
      { id: "umsetzung_1", text: "Gibt es definierte Prozesse, die strategische Ziele in konkrete operative Maßnahmen übersetzen?" },
      { id: "umsetzung_2", text: "Werden Ressourcen (Budget, Personal, Zeit) konsequent an strategischen Prioritäten ausgerichtet?" },
      { id: "umsetzung_3", text: "Existiert ein verbindliches System zur Nachverfolgung von Umsetzungsfortschritten?" },
      { id: "umsetzung_4", text: "Gibt es bei Planabweichungen einen klaren Eskalationsweg, der innerhalb eines Zeitfensters zu einer Entscheidung führt?" },
    ],
  },
  {
    id: "people",
    title: "People & Rollen",
    description:
      "Beantwortet, ob strategiekritische Rollen und Talentallokation aktiv gesteuert werden und Engpässe früh sichtbar sind.",
    questions: [
      { id: "people_1", text: "Sind die strategiekritischen Rollen für die nächsten 6–12 Monate klar benannt und priorisiert?" },
      { id: "people_2", text: "Gibt es einen systematischen Prozess zur Allokation von Talenten auf strategische Initiativen?" },
      { id: "people_3", text: "Werden Kapazitätsengpässe frühzeitig aktiv gesteuert?" },
      { id: "people_4", text: "Existieren klare Kriterien, nach denen Personalentscheidungen gegen die Strategie geprüft werden (mit klaren Konsequenzen)?" },
    ],
  },
  {
    id: "fuehrung",
    title: "Führung & Entscheidungen",
    description:
      "Beantwortet, ob Entscheidungswege, Verantwortlichkeiten und Konfliktlösung so gestaltet sind, dass Ergebnisse entstehen.",
    questions: [
      { id: "fuehrung_1", text: "Treffen Führungskräfte Entscheidungen innerhalb definierter Zeitrahmen?" },
      { id: "fuehrung_2", text: "Gibt es klare Verantwortlichkeiten für strategische Ergebnisse auf Führungsebene?" },
      { id: "fuehrung_3", text: "Werden Führungskräfte an strategischen Ergebnissen gemessen, nicht nur an operativen KPIs?" },
      { id: "fuehrung_4", text: "Gibt es einen klaren Mechanismus, um Führungskonflikte zu einer finalen Entscheidung zu bringen?" },
    ],
  },
  {
    id: "governance",
    title: "Governance & Anpassung",
    description:
      "Beantwortet, ob Trigger, Entscheidungsrechte und Learnings so in Governance verankert sind, dass Anpassungen schnell möglich sind.",
    questions: [
      { id: "governance_1", text: "Gibt es definierte Trigger, die strategische Überprüfungen auslösen?" },
      { id: "governance_2", text: "Können strategische Prioritäten schnell mit klarer Umplanung angepasst werden?" },
      { id: "governance_3", text: "Existieren klare Entscheidungsrechte für unterschiedliche Anpassungsszenarien?" },
      { id: "governance_4", text: "Werden Learnings aus Fehlentscheidungen systematisch in die Governance integriert?" },
    ],
  },
];

// ===== Types =====
type Answers = Record<string, number>;

type StoredState = {
  version: "v1";
  industryId?: string;
  // answers keyed by question.id (e.g. strategie_1 -> 0..5)
  answers: Answers;
  // optional future extension: followUps?: Record<string, string>
};

const TOTAL_QUESTIONS = DIMENSIONS.reduce((acc, d) => acc + d.questions.length, 0);

// ===== Helpers =====
function clampScore(v: number) {
  return Math.max(0, Math.min(5, v));
}

function getAnsweredCount(answers: Answers) {
  return Object.values(answers).filter((v) => typeof v === "number").length;
}

export default function AssessmentPage() {
  const router = useRouter();

  // stage: industry selection first, then assessment
  const [stage, setStage] = useState<"industry" | "assessment">("industry");
  const [industryId, setIndustryId] = useState<string | null>(null);

  const [dimensionIndex, setDimensionIndex] = useState(0); // 0..4
  const [answers, setAnswers] = useState<Answers>({});

  const currentDimension = DIMENSIONS[dimensionIndex];

  // Load stored state
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StoredState;
      if (parsed?.version !== "v1") return;

      if (parsed.industryId) {
        setIndustryId(parsed.industryId);
        setStage("assessment"); // if they already selected industry, continue
      }
      if (parsed.answers) setAnswers(parsed.answers);
    } catch {
      // ignore invalid JSON
    }
  }, []);

  // Persist state
  useEffect(() => {
    const payload: StoredState = {
      version: "v1",
      industryId: industryId ?? undefined,
      answers,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [industryId, answers]);

  const answeredCount = useMemo(() => getAnsweredCount(answers), [answers]);
  const overallProgress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  // current dimension completeness
  const dimensionComplete = useMemo(() => {
    return currentDimension.questions.every((q) => typeof answers[q.id] === "number");
  }, [answers, currentDimension.questions]);

  const setAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: clampScore(value) }));
  };

  const goBack = () => {
    if (stage === "assessment") {
      // If on first dimension, go back to industry selection; otherwise previous dimension
      if (dimensionIndex === 0) {
        setStage("industry");
        return;
      }
      setDimensionIndex((i) => Math.max(0, i - 1));
      return;
    }
    // stage === industry
    router.push("/");
  };

  const goNext = () => {
    if (stage === "industry") {
      if (!industryId) return;
      setStage("assessment");
      setDimensionIndex(0);
      return;
    }

    // stage === assessment
    if (dimensionIndex < DIMENSIONS.length - 1) {
      setDimensionIndex((i) => i + 1);
    } else {
      // last dimension completed -> go to lead-gate (results shown after lead gate in your flow)
      router.push("/lead-gate");
    }
  };

  return (
    <div className="min-h-screen">
      <Header variant="public" />

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Top back */}
        <button
          type="button"
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        {/* ====== INDUSTRY SELECTION ====== */}
        {stage === "industry" && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="text-xs tracking-widest text-emerald-700">BRANCHENAUSWAHL</div>
              <h1 className="mt-2 text-3xl font-semibold">
                In welcher Branche ist Ihr Unternehmen tätig?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Diese Information ermöglicht uns, Ihre Ergebnisse mit Branchenbenchmarks zu vergleichen.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {INDUSTRIES.map((i) => {
                const selected = industryId === i.id;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setIndustryId(i.id)}
                    className={[
                      "rounded-xl border bg-white px-6 py-5 text-left shadow-sm transition",
                      "hover:bg-muted/30",
                      selected ? "border-primary ring-2 ring-primary/20" : "border-muted",
                    ].join(" ")}
                  >
                    <div className="text-base font-semibold">{i.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{i.subtitle}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <Button variant="outline" onClick={goBack}>
                Zurück
              </Button>
              <Button onClick={goNext} disabled={!industryId} className="min-w-56">
                Weiter zur Diagnose
              </Button>
            </div>
          </div>
        )}

        {/* ====== ASSESSMENT ====== */}
        {stage === "assessment" && (
          <div className="space-y-8">
            {/* Gesamtfortschritt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Gesamtfortschritt</span>
                <span>
                  {answeredCount} / {TOTAL_QUESTIONS} Fragen ({overallProgress}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Header line: title + dimension progress + scale legend */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">PSEI Strategiediagnose</div>
                <h1 className="mt-2 text-3xl font-semibold">{currentDimension.title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {currentDimension.description}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="text-sm text-muted-foreground">
                  Dimension {dimensionIndex + 1} / {DIMENSIONS.length}
                </div>
                <div className="rounded-full border bg-white px-4 py-2 text-xs text-muted-foreground">
                  0 = Trifft nicht zu &nbsp;→&nbsp; 5 = Trifft vollständig zu
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-3">
              {currentDimension.questions.map((q, idx) => (
                <Card key={q.id} className="rounded-xl">
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      <span className="mr-2 text-muted-foreground">{idx + 1}.</span>
                      {q.text}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {[0, 1, 2, 3, 4, 5].map((v) => {
                        const selected = answers[q.id] === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAnswer(q.id, v)}
                            className={[
                              "h-10 w-10 rounded-lg border text-sm font-medium transition",
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-muted bg-white hover:bg-muted/30",
                            ].join(" ")}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={goBack}>
                Zurück
              </Button>

              <Button onClick={goNext} disabled={!dimensionComplete}>
                {dimensionIndex === DIMENSIONS.length - 1 ? "Weiter" : "Weiter"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}