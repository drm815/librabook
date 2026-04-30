import TimetableSettings from '@/components/admin/TimetableSettings';

export default function AdminTimetablePage() {
  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-6">타임테이블 관리</h1>
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <TimetableSettings />
      </div>
    </div>
  );
}
