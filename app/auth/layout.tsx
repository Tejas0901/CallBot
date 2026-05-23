import { ReactNode } from 'react';
import { Phone, BarChart3, Users, Zap } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding & value props */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-orange-50 via-orange-100 to-amber-50 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-100 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">CallBot</span>
          </div>

          {/* Hero content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Supercharge your<br />call campaigns
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-md">
                Automate outreach, track performance, and close more deals with intelligent call campaign management.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              {[
                { icon: Phone, text: 'AI-powered call automation' },
                { icon: BarChart3, text: 'Real-time analytics & reporting' },
                { icon: Users, text: 'Candidate screening at scale' },
                { icon: Zap, text: 'Seamless ATS integrations' },
              ].map((feature) => (
                <div key={feature.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-200/60 flex items-center justify-center shrink-0">
                    <feature.icon className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-gray-700 text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial / social proof */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100">
            <p className="text-gray-600 text-sm leading-relaxed italic">
              &ldquo;CallBot cut our screening time by 70% and helped us reach 3x more candidates. It&rsquo;s a game-changer for our recruiting team.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 text-xs font-bold">AK</span>
              </div>
              <div>
                <p className="text-gray-900 text-sm font-medium">Amit Kumar</p>
                <p className="text-gray-500 text-xs">Head of Talent, TechCorp</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 sm:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
