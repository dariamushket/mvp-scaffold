import Link from "next/link";
import { Header } from "@/components/layouts";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { ArrowRight, BarChart3, CheckCircle2, Users } from "lucide-react";

export default async function LandingPage() {
  const user = await getUser();
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen">
      <Header variant="public" isAuthenticated={isAuthenticated} />

      <main>
        {/* Hero Section */}
        <section className="container mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Discover Your Business
            <span className="text-primary"> Growth Potential</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Take our comprehensive assessment to identify your business bottlenecks and unlock your
            path to sustainable growth.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/lead-gate">
              <Button size="lg">
                Start Assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto max-w-7xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <Users className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle>1. Register Your Interest</CardTitle>
                  <CardDescription>
                    Provide your contact details to get started with the assessment.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle>2. Take the Assessment</CardTitle>
                  <CardDescription>
                    Answer questions about your business across key growth dimensions.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CheckCircle2 className="mb-2 h-10 w-10 text-primary" />
                  <CardTitle>3. Get Your Results</CardTitle>
                  <CardDescription>
                    Receive a personalized score and expert guidance.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto max-w-7xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Grow?</h2>
            <p className="mb-8 text-muted-foreground">
              Join hundreds of business owners who have transformed their businesses.
            </p>
            <Link href="/lead-gate">
              <Button size="lg">
                Start Free Assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MVP App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
