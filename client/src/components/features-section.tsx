import { Smartphone, Shield, TrendingUp, RefreshCw, CheckCircle, Code } from "lucide-react";

const features = [
  {
    icon: Smartphone,
    title: "M-Pesa Integration",
    description: "Full M-Pesa integration with C2B, B2C, and STK Push support. Handle transactions seamlessly with real-time callbacks.",
    color: "text-secondary",
    bgColor: "bg-secondary/10"
  },
  {
    icon: Shield,
    title: "Secure Authentication",
    description: "OAuth 2.0 authentication with API key management. Built-in rate limiting and comprehensive security measures.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: TrendingUp,
    title: "Real-time Analytics",
    description: "Comprehensive transaction tracking with detailed reporting and analytics for business insights.",
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    icon: RefreshCw,
    title: "Webhook Support",
    description: "Real-time payment notifications via webhooks. Ensure your application stays synchronized with payment status.",
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
  {
    icon: CheckCircle,
    title: "Compliance Ready",
    description: "Built with Kenyan regulations in mind. Includes KYC/AML compliance and audit logging capabilities.",
    color: "text-secondary",
    bgColor: "bg-secondary/10"
  },
  {
    icon: Code,
    title: "Developer Friendly",
    description: "Comprehensive documentation, SDKs, and interactive API playground for seamless integration.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Everything you need for payment integration
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Comprehensive payment processing with real-time tracking, secure authentication, and detailed reporting.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-slate-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-6`}>
                <feature.icon className={`${feature.color} w-6 h-6`} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
