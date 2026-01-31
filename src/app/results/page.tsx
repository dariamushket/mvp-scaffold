import Link from "next/link";
import { Header } from "@/components/layouts";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { ArrowRight, Calendar, Download, TrendingUp, AlertTriangle, Target } from "lucide-react";

// TODO: Fetch actual results from database based on assessment
const MOCK_RESULTS = {
  score: 72,
  maxScore: 100,
  businessType: "Growth-Stage Startup",
  bottleneck: "Operations & Systems",
  strengths: ["Strong product-market fit", "Growing customer base", "Solid revenue foundation"],
  improvements: ["Process documentation", "Team delegation", "Scalable systems"],
};

export default function ResultsPage() {
  const scorePercentage = (MOCK_RESULTS.score / MOCK_RESULTS.maxScore) * 100;

  return (
    <div className="min-h-screen">
      <Header variant="public" />

      <main className="container mx-auto max-w-4xl px-4 py-12">
        {/* Score Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-bold">Your Assessment Results</h1>
          <p className="text-muted-foreground">
            Here&apos;s what we discovered about your business
          </p>
        </div>

        {/* Score Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center md:flex-row md:gap-12">
              {/* Score Circle */}
              <div className="relative mb-6 flex h-48 w-48 items-center justify-center md:mb-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${scorePercentage * 2.51} 251`}
                    className="text-primary"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-bold">{MOCK_RESULTS.score}</span>
                  <span className="text-sm text-muted-foreground">
                    out of {MOCK_RESULTS.maxScore}
                  </span>
                </div>
              </div>

              {/* Score Details */}
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-2">
                    <Target className="mr-1 h-3 w-3" />
                    {MOCK_RESULTS.businessType}
                  </Badge>
                </div>
                <h2 className="mb-2 text-2xl font-bold">Your Growth Score</h2>
                <p className="text-muted-foreground">
                  Your business shows strong potential with room for improvement in key areas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottleneck Card */}
        <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Primary Bottleneck Identified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="mb-2 text-xl font-semibold">{MOCK_RESULTS.bottleneck}</h3>
            <p className="text-muted-foreground">
              This is the area that&apos;s most limiting your business growth. Addressing this
              bottleneck should be your top priority.
            </p>
          </CardContent>
        </Card>

        {/* Strengths & Improvements */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {MOCK_RESULTS.strengths.map((strength, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-400">
                      {index + 1}
                    </span>
                    {strength}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {MOCK_RESULTS.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">Ready to Accelerate Your Growth?</h2>
            <p className="mb-6 text-primary-foreground/80">
              Book a free strategy session to discuss your results and create a customized action
              plan.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary">
                <Calendar className="mr-2 h-4 w-4" />
                Book Strategy Session
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                <Download className="mr-2 h-4 w-4" />
                Download Full Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Return Link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="mr-1 inline h-4 w-4 rotate-180" />
            Return to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
