import { Sidebar } from './components/sidebar';
import { Header } from './components/header';
import { AIInsights } from './components/ai-insights';
import { MetricsCards } from './components/metrics-cards';
import { DailySchedule } from './components/daily-schedule';
import { LeadsPipeline } from './components/leads-pipeline';
import { AIAssistant } from './components/ai-assistant';
import { AIRecommendations } from './components/ai-recommendations';
import { ThemeProvider } from './contexts/theme-context';

export default function App() {
  return (
    <ThemeProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Dashboard Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-6">
              {/* AI Insights - Top Priority */}
              <AIInsights />

              {/* Metrics Cards */}
              <MetricsCards />

              {/* Two Column Layout */}
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - AI Recommendations + Leads Pipeline */}
                <div className="col-span-2 space-y-6">
                  {/* AI Recommendations - Proactive Copilot */}
                  <AIRecommendations />
                  
                  {/* Leads Pipeline */}
                  <LeadsPipeline />
                </div>

                {/* Right Column - Daily Schedule */}
                <div className="col-span-1">
                  <DailySchedule />
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* AI Assistant - Floating Chat */}
        <AIAssistant />
      </div>
    </ThemeProvider>
  );
}