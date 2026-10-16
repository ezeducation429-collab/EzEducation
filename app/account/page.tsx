import type { Metadata } from 'next';
import StudentAccount from './student-account';

export const metadata: Metadata = {
    title: 'Student account | Ez Education',
    robots: { index: false, follow: false },
    alternates: { canonical: '/account' },
    description:
        'Manage your Ez Education student account. View purchased courses, update profile, and manage settings.',
};

export default function AccountPage() {
    return <StudentAccount />;
}
