import { useParams } from 'react-router-dom'

export default function ClinicView() {
  const { clientCode } = useParams()
  return <div className="p-8 text-slate-900">Clinic View \u2014 {clientCode} \u2014 coming soon</div>
}
