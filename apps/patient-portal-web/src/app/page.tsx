export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-6">
          Eye Hospital Patient Portal
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Your Patient Portal</h2>
          <p className="text-gray-600 mb-6">
            Manage your appointments, view medical records, and communicate with your healthcare providers.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Book Appointment</h3>
              <p className="text-sm text-blue-600">Schedule your next visit with our specialists</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Medical Records</h3>
              <p className="text-sm text-green-600">Access your treatment history and reports</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">Prescriptions</h3>
              <p className="text-sm text-purple-600">View and manage your prescriptions</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">Support</h3>
              <p className="text-sm text-orange-600">Get help and contact support</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Eye Hospital Management System v1.0.0</p>
          <p>Running in Replit Environment ✓</p>
        </div>
      </div>
    </main>
  )
}