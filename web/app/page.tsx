import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Hero Section */}
      <section className="py-20 px-6 text-center bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-800">
            Verify Products. Build Customer Trust.
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-2xl mx-auto">
            ScanVerify helps pharmacies and vendors verify products, receive
            secure payments, and build credibility with customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Register
            </button>
            <button className="border-2 border-teal-600 text-teal-600 hover:bg-teal-50 px-8 py-3 rounded-lg font-semibold transition-colors">
              Login
            </button>
          </div>
          {/* Mockup Illustration Placeholder */}
          <div className="flex justify-center items-center space-x-8 mt-12">
            <div className="bg-gray-100 p-6 rounded-lg shadow-sm">
              <div className="w-32 h-32 bg-teal-200 rounded flex items-center justify-center">
                <span className="text-teal-800 font-bold">Dashboard</span>
              </div>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg shadow-sm">
              <div className="w-32 h-32 bg-green-200 rounded flex items-center justify-center">
                <span className="text-green-800 font-bold">QR Code</span>
              </div>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg shadow-sm">
              <div className="w-32 h-32 bg-blue-200 rounded flex items-center justify-center">
                <span className="text-blue-800 font-bold">Verified Badge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Pharmacies Join */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Why Pharmacies Join
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl">✓</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Verified Business Badge
              </h3>
              <p className="text-gray-600">
                Display your verified status to build customer confidence.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl">#</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Unique Vendor Code</h3>
              <p className="text-gray-600">
                Get your own code for easy customer payments.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl">$</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-600">
                Accept customer payments safely and reliably.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Transaction Dashboard
              </h3>
              <p className="text-gray-600">
                Track your payments and business insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            How It Works
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-8 md:mb-0">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Register Your Pharmacy
              </h3>
              <p className="text-gray-600">
                Sign up with your business details.
              </p>
            </div>
            <div className="text-center">
              <span className="text-4xl text-teal-600">→</span>
            </div>
            <div className="text-center md:text-left mb-8 md:mb-0">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Receive Your QR Code & Vendor Code
              </h3>
              <p className="text-gray-600">Get your unique identifiers.</p>
            </div>
            <div className="text-center">
              <span className="text-4xl text-teal-600">→</span>
            </div>
            <div className="text-center md:text-left">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-teal-600 text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Start Receiving Payments
              </h3>
              <p className="text-gray-600">
                Accept verified customer payments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Dashboard Preview
          </h2>
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Vendor Code</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <span className="text-2xl font-mono">PHARM-1234</span>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-2">QR Code</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <div className="w-20 h-20 bg-black mx-auto"></div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-2">Transactions</h3>
                <div className="bg-gray-100 p-4 rounded">
                  <span className="text-2xl font-bold">₦50,000</span>
                  <p className="text-sm text-gray-600">This Month</p>
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-2">Verified Badge</h3>
                <div className="bg-green-100 p-4 rounded">
                  <span className="text-green-600 font-bold">✓ VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8 text-gray-800">
            Built for Pharmacies and Vendors
          </h2>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Secure Payment Integration
              </h3>
              <p className="text-gray-600">
                Reliable and safe payment processing for your business.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Verification-First Platform
              </h3>
              <p className="text-gray-600">
                Designed to build customer trust through product verification.
              </p>
            </div>
          </div>
          <div className="bg-teal-50 p-8 rounded-lg">
            <p className="text-lg text-gray-700">
              Join thousands of pharmacies across Nigeria who trust ScanVerify
              for secure, verified transactions.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-teal-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Join ScanVerify Today</h2>
          <p className="text-xl mb-8">
            Start building customer trust and secure payments for your pharmacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Register Your Business
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-teal-600 px-8 py-3 rounded-lg font-semibold transition-colors">
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">ScanVerify</h3>
              <p className="text-gray-400">
                Building trust in healthcare through verification.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">support@scanverify.com</p>
              <p className="text-gray-400">+234 123 456 7890</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <p className="text-gray-400">Social media links</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ScanVerify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
