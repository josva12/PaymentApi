import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Coins, Bell, User } from "lucide-react";

export default function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Coins className="text-white w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-slate-900">KenyanPay API</span>
              </div>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link href="/#overview">
                <a className="text-slate-600 hover:text-primary transition-colors font-medium">
                  Overview
                </a>
              </Link>
              <Link href="/documentation">
                <a className="text-slate-600 hover:text-primary transition-colors font-medium">
                  Documentation
                </a>
              </Link>
              <Link href="/dashboard">
                <a className="text-slate-600 hover:text-primary transition-colors font-medium">
                  Dashboard
                </a>
              </Link>
              <Link href="/playground">
                <a className="text-slate-600 hover:text-primary transition-colors font-medium">
                  API Playground
                </a>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-slate-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Developer</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
