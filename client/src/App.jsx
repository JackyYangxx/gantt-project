import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectPage from './pages/ProjectPage';

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:id" element={<ProjectPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
