export default function HospitalDashboard() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-600 mb-6">
          Eye Hospital HR Portal
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Hospital Management Dashboard</h2>
          <p className="text-gray-600 mb-8">
            Manage staff, schedules, patient records, and hospital operations from this central hub.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Staff Management</h3>
              <p className="text-sm text-blue-600 mb-4">Manage doctors, nurses, and administrative staff</p>
              <div className="text-xs text-blue-500">• Employee records • Scheduling • Performance</div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Patient Records</h3>
              <p className="text-sm text-green-600 mb-4">Access and manage patient information</p>
              <div className="text-xs text-green-500">• Medical history • Treatment plans • Reports</div>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">Appointments</h3>
              <p className="text-sm text-purple-600 mb-4">Schedule and manage patient appointments</p>
              <div className="text-xs text-purple-500">• Daily schedules • Room assignments • Conflicts</div>
            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">Billing & Finance</h3>
              <p className="text-sm text-orange-600 mb-4">Financial operations and billing</p>
              <div className="text-xs text-orange-500">• Invoices • Payments • Insurance claims</div>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Inventory</h3>
              <p className="text-sm text-red-600 mb-4">Medical supplies and equipment</p>
              <div className="text-xs text-red-500">• Stock levels • Orders • Equipment maintenance</div>
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-lg">
              <h3 className="font-semibold text-indigo-800 mb-2">Analytics</h3>
              <p className="text-sm text-indigo-600 mb-4">Hospital performance and reporting</p>
              <div className="text-xs text-indigo-500">• KPIs • Financial reports • Patient satisfaction</div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Eye Hospital HR Portal v1.0.0</p>
          <p>Running on port 3001 ✓</p>
        </div>
      </div>
    </main>
  )
}