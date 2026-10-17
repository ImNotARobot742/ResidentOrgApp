import { FormEvent, useState } from 'react';
import { setPassword } from '../api';

const getError = (error: unknown) => {
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return response?.data?.error ?? 'Le mot de passe n’a pas pu être défini.';
};

export default function SetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await setPassword(token, password, confirmPassword);
      setComplete(true);
    } catch (requestError) {
      setError(getError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-md sm:p-8">
        <p className="text-sm font-semibold uppercase text-blue-700">Org’atelier</p>
        {complete ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Mot de passe défini</h1>
            <p className="mt-3 text-sm text-gray-600">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <button type="button" onClick={() => window.location.assign('/')} className="mt-6 min-h-12 w-full rounded bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">
              Aller à la connexion
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Définir mon mot de passe</h1>
            <p className="mt-2 text-sm text-gray-600">Choisissez un mot de passe d’au moins 10 caractères.</p>
            <form className="mt-6 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  value={password}
                  onChange={(event) => setPasswordValue(event.currentTarget.value)}
                  className="mt-1 min-h-12 w-full rounded border border-gray-300 px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                  className="mt-1 min-h-12 w-full rounded border border-gray-300 px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </label>
              {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <button type="submit" disabled={submitting || !token} className="min-h-12 w-full rounded bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                {submitting ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}
              </button>
              {!token && <p role="alert" className="text-sm text-red-800">Le lien de configuration est manquant ou invalide.</p>}
            </form>
          </>
        )}
      </section>
    </main>
  );
}