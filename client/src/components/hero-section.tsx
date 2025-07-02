import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Unified Payment API for Kenya
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Integrate M-Pesa, Airtel Money, and bank payments with a single, secure API. 
              Built for Kenyan businesses with compliance and scalability in mind.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard">
                <Button className="bg-white text-primary px-8 py-3 hover:bg-slate-50">
                  Get Started
                </Button>
              </Link>
              <Link href="/documentation">
                <Button variant="outline" className="border-white text-white px-8 py-3 hover:bg-white hover:text-primary">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="bg-slate-900 rounded-lg p-4 text-sm">
              <div className="text-green-400 mb-2">// Initialize payment request</div>
              <div className="text-blue-300">POST</div>
              <div className="text-white">/api/v1/payments/initiate</div>
              <div className="mt-4 text-slate-300">
                {`{`}<br />
                &nbsp;&nbsp;"amount": 1000,<br />
                &nbsp;&nbsp;"currency": "KES",<br />
                &nbsp;&nbsp;"provider": "mpesa",<br />
                &nbsp;&nbsp;"phone": "254712345678"<br />
                {`}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
