export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="text-center space-y-8">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">
          Hello World! 🎉
        </h1>
        
        <h2 className="text-4xl font-semibold text-gray-800 dark:text-gray-200">
          BearbrickDB
        </h2>
        
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          실제 환경 배포 테스트 성공! <br />
          Next.js 15 + Supabase + Vercel
        </p>
        
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg max-w-md mx-auto">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✅ GitHub 연동 완료 <br />
            ✅ Supabase 데이터베이스 연결 <br />
            ✅ Vercel 자동 배포 성공
          </p>
        </div>
      </main>
    </div>
  );
}
