import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminSubscribers from "@/components/admin/AdminSubscribers";
import AdminDiscounts from "@/components/admin/AdminDiscounts";
import AdminQuestions from "@/components/admin/AdminQuestions";
import AdminPassages from "@/components/admin/AdminPassages";
import AdminTiers from "@/components/admin/AdminTiers";
import AdminAbandoned from "@/components/admin/AdminAbandoned";
import AdminTimeAnalytics from "@/components/admin/AdminTimeAnalytics";
import AdminTips from "@/components/admin/AdminTips";

const Admin = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">TILPrep — Admin</Link>
          <Link to="/dashboard"><Button variant="outline" size="sm">Dashboard</Button></Link>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Analytics</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="passages">Passages</TabsTrigger>
            <TabsTrigger value="tiers">Tiers</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="abandoned">Abandoned</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
          <TabsContent value="questions"><AdminQuestions /></TabsContent>
          <TabsContent value="passages"><AdminPassages /></TabsContent>
          <TabsContent value="tiers"><AdminTiers /></TabsContent>
          <TabsContent value="time"><AdminTimeAnalytics /></TabsContent>
          <TabsContent value="abandoned"><AdminAbandoned /></TabsContent>
          <TabsContent value="tips"><AdminTips /></TabsContent>
          <TabsContent value="subscribers"><AdminSubscribers /></TabsContent>
          <TabsContent value="discounts"><AdminDiscounts /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
