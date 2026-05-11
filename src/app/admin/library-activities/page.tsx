'use client';
import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  date: string;
  content: string;
  userId: string;
  userName: string;
  studentId: string;
  createdAt: string;
}

function parseStudentId(studentId: string) {
  if (!studentId || studentId.length < 3) return '';
  const grade = studentId[0];
  const classNum = String(parseInt(studentId.slice(1, 3), 10));
  return `${grade}학년 ${classNum}반`;
}

export default function AdminLibraryActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetch('/api/library-activities')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setActivities(data);
        setLoading(false);
      });
  }, []);

  const filtered = activities.filter(a => {
    if (filterName && !a.userName.includes(filterName)) return false;
    if (filterDate && a.date !== filterDate) return false;
    return true;
  });

  // 학생별 그룹
  const byStudent = filtered.reduce<Record<string, { name: string; studentId: string; activities: Activity[] }>>((acc, a) => {
    if (!acc[a.userId]) acc[a.userId] = { name: a.userName, studentId: a.studentId, activities: [] };
    acc[a.userId].activities.push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#FDF6F0] p-6">
      <h1 className="text-xl font-bold mb-6">도서부 활동 기록</h1>

      {/* 필터 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex gap-3 flex-wrap">
        <input
          placeholder="이름으로 검색"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A] w-40"
        />
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8899A]"
        />
        {(filterName || filterDate) && (
          <button
            onClick={() => { setFilterName(''); setFilterDate(''); }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            초기화
          </button>
        )}
        <span className="text-sm text-gray-400 self-center ml-auto">{filtered.length}건</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">활동 기록이 없습니다.</div>
      ) : filterDate ? (
        /* 날짜 필터 시: 플랫 리스트 */
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">날짜</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">학년/반</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">활동 내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{a.date}</td>
                  <td className="px-4 py-3 font-medium">{a.userName}</td>
                  <td className="px-4 py-3 text-gray-500">{parseStudentId(a.studentId)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap">{a.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 기본: 학생별 그룹 */
        <div className="space-y-4">
          {Object.values(byStudent).map(({ name, studentId, activities: acts }) => (
            <div key={name} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700">{name}</span>
                  <span className="text-xs text-gray-400">{parseStudentId(studentId)}</span>
                </div>
                <span className="text-xs text-gray-400">{acts.length}건</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {acts.map(a => (
                  <li key={a.id} className="px-5 py-3 flex gap-4">
                    <span className="text-xs text-gray-400 shrink-0 pt-0.5">{a.date}</span>
                    <span className="text-sm text-gray-700 whitespace-pre-wrap">{a.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
