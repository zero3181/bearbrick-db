'use client';

import { useState } from 'react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const setupDatabase = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/setup-db', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to setup database' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="text-center space-y-8 max-w-2xl mx-auto">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">
          Hello World! 🎉
        </h1>
        
        <h2 className="text-4xl font-semibold text-gray-800 dark:text-gray-200">
          BearbrickDB
        </h2>
        
        <p className="text-xl text-gray-600 dark:text-gray-400">
          실제 환경 배포 테스트 성공! <br />
          Next.js 15 + Supabase + Vercel
        </p>
        
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✅ GitHub 연동 완료 <br />
            ✅ Supabase 데이터베이스 연결 <br />
            ✅ Vercel 자동 배포 성공
          </p>
        </div>

        <div className="bg-yellow-100 dark:bg-yellow-900 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
            🛠️ 데이터베이스 설정
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            베어브릭 데이터베이스 테이블을 생성하려면 버튼을 클릭하세요.
          </p>
          
          <button
            onClick={setupDatabase}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {isLoading ? '설정 중...' : '데이터베이스 설정하기'}
          </button>
          
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              <h4 className="font-medium mb-2">
                {result.success ? '✅ 성공!' : '❌ 실패'}
              </h4>
              <p className="text-sm">{result.message || result.error}</p>
              {result.success && (
                <p className="text-sm mt-2">
                  Supabase → Database → Tables에서 테이블 생성을 확인해보세요!
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
