'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

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
        <div className="max-w-md mx-auto">
          <div className="bg-blue-100 dark:bg-blue-900 p-8 rounded-lg text-center">
            <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">
              🧸 베어브릭 탐색
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-6">
              1,100개 이상의 베어브릭 컬렉션을 만나보세요. 시리즈별, 카테고리별로 필터링하고 검색할 수 있습니다.
            </p>
            
            <a
              href="/bearbricks"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              베어브릭 목록 보기
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
