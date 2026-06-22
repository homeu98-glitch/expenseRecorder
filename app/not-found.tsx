import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <h2 className="text-2xl font-bold">頁面未找到 (Custom 404)</h2>
      <p>請檢查網址是否正確</p>
      <Link href="/" className="text-blue-600 hover:underline">
        返回首頁
      </Link>
    </div>
  )
}
