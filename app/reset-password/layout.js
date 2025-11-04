// Force dynamic rendering for reset-password route
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

export default function ResetPasswordLayout({ children }) {
  return children
}

