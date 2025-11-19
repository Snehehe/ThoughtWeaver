import { Link, useLocation } from "react-router-dom";
import { Brain, Plus, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";

export default function Layout({ children }) {
  const location = useLocation();

  const nav = [
    { name: "Graph", path: "/", icon: Brain },
    { name: "Insights", path: "/insights", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-purple-900/20 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            <h1 className="text-xl font-bold">ThoughtWeaver</h1>
          </Link>

          <div className="hidden md:flex gap-2">
            {nav.map((item) => (
              <Link to={item.path} key={item.name}>
                <Button
                  className={
                    location.pathname === item.path
                      ? "bg-purple-600"
                      : "bg-black/20"
                  }
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>

          <Link to="/capture">
            <Button className="bg-purple-600">
              <Plus className="w-4 h-4 mr-2" /> New Thought
            </Button>
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
