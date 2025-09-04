'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface ApiResult {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const setupDatabase = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/setup-db', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: 'Failed to setup database' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center space-x-6">
            <a
              href="/"
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              BearbrickDB
            </a>
            <a
              href="/bearbricks"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              베어브릭 목록
            </a>
            {session?.user && (
              <a
                href="/admin/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                관리자
              </a>
            )}
          </nav>
          
          <div>
            {status === 'loading' ? (
              <div className="animate-pulse bg-gray-300 h-10 w-20 rounded"></div>
            ) : session ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  안녕하세요, {session.user?.name}님
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-100 dark:bg-blue-900 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
              🧸 베어브릭 탐색
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              1,100개 이상의 베어브릭 컬렉션을 만나보세요. 시리즈별, 카테고리별로 필터링하고 검색할 수 있습니다.
            </p>
            
            <a
              href="/bearbricks"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              베어브릭 목록 보기
            </a>
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
        </div>
      </main>
    </div>
  );
}
