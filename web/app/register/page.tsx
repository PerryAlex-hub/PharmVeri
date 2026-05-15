"use client";

import { useState } from "react";
import Link from "next/link";

export default function Register() {
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    ownerName: "",
    email: "",
    phone: "",
    bankAccount: "",
    bankName: "",
    state: "",
    city: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          businessName: "",
          businessType: "",
          ownerName: "",
          email: "",
          phone: "",
          bankAccount: "",
          bankName: "",
          state: "",
          city: "",
        });
        setIsSuccess(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 font-sans">
      {/* Header */}
      <header className="py-6 px-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-600">PharmVeri</h1>
          <Link
            href="/login"
            className="text-teal-600 hover:text-teal-700 font-semibold"
          >
            Already registered? Login
          </Link>
        </div>
      </header>

      <div className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Left Panel - Information */}
            <div className="md:col-span-1 hidden md:flex flex-col justify-start">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  Why Join PharmVeri?
                </h3>

                <div className="mb-6">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-teal-600 text-xl">✓</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Verified Badge
                  </h4>
                  <p className="text-sm text-gray-600">
                    Display your verified business status to build customer
                    trust
                  </p>
                </div>

                <div className="mb-6">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-teal-600 text-xl">#</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Unique Code
                  </h4>
                  <p className="text-sm text-gray-600">
                    Get your vendor code and QR code for customer payments
                  </p>
                </div>

                <div className="mb-6">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-teal-600 text-xl">$</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Secure Payments
                  </h4>
                  <p className="text-sm text-gray-600">
                    Accept verified customer payments safely through Squad
                  </p>
                </div>

                <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 mt-8">
                  <p className="text-sm text-teal-800 italic">
                    "Trusted verification and secure payment tools for modern
                    pharmacies."
                  </p>
                </div>

                {/* Dashboard Preview */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4">
                    Your Dashboard
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-gray-600">
                        VENDOR CODE
                      </span>
                      <span className="text-sm font-bold text-gray-800">
                        PHARM-2024
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-gray-600">
                        QR CODE
                      </span>
                      <div className="w-8 h-8 bg-gray-800 rounded"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-600">
                        STATUS
                      </span>
                      <span className="text-xs font-bold text-green-600">
                        ✓ VERIFIED
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Registration Form */}
            <div className="md:col-span-2">
              <div className="bg-white p-8 md:p-12 rounded-lg shadow-sm">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  Register Your Business
                </h2>
                <p className="text-gray-600 mb-8">
                  Join PharmVeri to receive your verified badge, vendor code, QR
                  code, and payment dashboard access.
                </p>

                {isSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-green-600 text-3xl">✓</span>
                    </div>
                    <h3 className="text-2xl font-bold text-green-800 mb-2">
                      Registration Successful!
                    </h3>
                    <p className="text-green-700">
                      Your vendor account has been created. You will be
                      redirected to login.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Business Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">🏢</span> Business Name
                      </label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder="e.g., Central Pharmacy Ltd."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* Business Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">📋</span> Business Type
                      </label>
                      <select
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all appearance-none"
                        required
                      >
                        <option value="">Select business type</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="supermarket">Supermarket</option>
                        <option value="chemist">Chemist</option>
                        <option value="general-store">General Store</option>
                      </select>
                    </div>

                    {/* Owner Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">👤</span> Owner Full Name
                      </label>
                      <input
                        type="text"
                        name="ownerName"
                        value={formData.ownerName}
                        onChange={handleChange}
                        placeholder="e.g., Dr. John Okonkwo"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">✉️</span> Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g., john@centralpharmacy.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">📱</span> Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g., +234 801 234 5678"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* Bank Account Number */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">🏦</span> Bank Account Number
                      </label>
                      <input
                        type="text"
                        name="bankAccount"
                        value={formData.bankAccount}
                        onChange={handleChange}
                        placeholder="e.g., 1234567890"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* Bank Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">🏛️</span> Bank Name
                      </label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        placeholder="e.g., First Bank of Nigeria"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">📍</span> State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="e.g., Lagos"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="text-lg">🏙️</span> City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g., Victoria Island"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                        isLoading
                          ? "bg-teal-400 cursor-not-allowed"
                          : "bg-teal-600 hover:bg-teal-700 active:scale-95"
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating account...
                        </div>
                      ) : (
                        "Create Vendor Account"
                      )}
                    </button>

                    {/* Security Note */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                      <span className="text-blue-600 text-xl mr-3">🔒</span>
                      <p className="text-sm text-blue-800">
                        Your business and banking information is securely
                        protected with industry-standard encryption.
                      </p>
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Legal Text */}
              <p className="text-sm text-gray-600 text-center mt-6">
                By registering, you agree to our{" "}
                <a href="#" className="text-teal-600 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-teal-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
