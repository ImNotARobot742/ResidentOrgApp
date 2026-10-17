import { FormEvent, useState } from 'react';
import { useUser } from '../context/UserContext';

export default function Login() {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (requestError) {
      const response = (requestError as { response?: { data?: { error?: string } } }).response;
      setError(response?.data?.error ?? 'Connexion impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-md sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase text-blue-700">Org’atelier</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Connexion</h1>
        </div>
        <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium text-gray-700">
            Adresse courriel
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              className="mt-1 min-h-12 w-full rounded border border-gray-300 px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Mot de passe
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              className="mt-1 min-h-12 w-full rounded border border-gray-300 px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </label>
          {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
}