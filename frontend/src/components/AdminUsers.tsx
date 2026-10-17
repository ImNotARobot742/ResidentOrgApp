import { FormEvent, useEffect, useState } from 'react';
import { User } from '../../../shared/types';
import { createAdminUser, deleteAdminUser, getAdminUsers, regenerateAdminPassword, updateAdminUser } from '../api';

const roles: { value: Exclude<User['role'], 'admin'>; label: string }[] = [
  { value: 'artisan', label: 'Artisan' },
  { value: 'institut', label: 'Institut' },
];

const blankAccount = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'artisan' as User['role'],
  color: '#2563EB',
};

type AccountEditForm = Pick<User, 'firstName' | 'lastName' | 'email' | 'role'>;

const getError = (error: unknown) => {
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return response?.data?.error ?? 'Une erreur est survenue.';
};

export default function AdminUsers() {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [form, setForm] = useState(blankAccount);
  const [editingAccount, setEditingAccount] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<AccountEditForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [regeneratingPassword, setRegeneratingPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [dialogNotice, setDialogNotice] = useState('');
  const [dialogError, setDialogError] = useState('');

  const loadAccounts = async () => {
    const response = await getAdminUsers();
    setAccounts(response.data);
  };

  useEffect(() => {
    loadAccounts().catch((requestError) => setError(getError(requestError)));
  }, []);

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await createAdminUser(form);
      setForm(blankAccount);
      await loadAccounts();
      setNotice('Compte créé. Un courriel contenant un mot de passe temporaire et un lien de configuration a été envoyé.');
    } catch (requestError) {
      setError(getError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (account: User) => {
    setEditingAccount(account);
    setEditForm({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      role: account.role,
    });
    setDialogNotice('');
    setDialogError('');
  };

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAccount || !editForm) return;
    setBusy(true);
    setDialogError('');
    setDialogNotice('');
    try {
      await updateAdminUser(editingAccount.id, {
        ...editingAccount,
        ...editForm,
        name: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`,
      });
      await loadAccounts();
      setEditingAccount(null);
      setEditForm(null);
      setNotice('Informations du compte mises à jour.');
    } catch (requestError) {
      setDialogError(getError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const regeneratePassword = async () => {
    if (!editingAccount || !window.confirm(`Envoyer un nouveau mot de passe temporaire à ${editingAccount.email} ?`)) return;
    setRegeneratingPassword(true);
    setDialogError('');
    setDialogNotice('');
    try {
      await regenerateAdminPassword(editingAccount.id);
      setDialogNotice(`Un nouveau mot de passe temporaire et son lien de configuration ont été envoyés à ${editingAccount.email}.`);
    } catch (requestError) {
      setDialogError(getError(requestError));
    } finally {
      setRegeneratingPassword(false);
    }
  };

  const removeAccount = async (account: User) => {
    if (!window.confirm(`Supprimer le compte de ${account.name} ?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await deleteAdminUser(account.id);
      await loadAccounts();
      setNotice('Compte supprimé.');
    } catch (requestError) {
      setError(getError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const updateForm = (field: keyof typeof blankAccount, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateEditForm = <Field extends keyof AccountEditForm,>(
    field: Field,
    value: AccountEditForm[Field]
  ) => {
    setEditForm((current) => current ? { ...current, [field]: value } : current);
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold sm:text-2xl">Gestion des comptes</h2>
        <p className="mt-1 text-sm text-gray-600">Créer et gérer les accès de l’atelier.</p>
      </header>

      {(error || notice) && (
        <p role={error ? 'alert' : 'status'} className={`rounded p-3 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {error || notice}
        </p>
      )}

      <section className="border-b border-gray-200 pb-8">
        <h3 className="mb-4 text-lg font-semibold">Nouveau compte</h3>
        <form onSubmit={createAccount} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">Prénom
            <input required value={form.firstName} onChange={(event) => updateForm('firstName', event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3" />
          </label>
          <label className="text-sm font-medium text-gray-700">Nom
            <input required value={form.lastName} onChange={(event) => updateForm('lastName', event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3" />
          </label>
          <label className="text-sm font-medium text-gray-700">Adresse courriel
            <input required type="email" value={form.email} onChange={(event) => updateForm('email', event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3" />
          </label>
          <label className="text-sm font-medium text-gray-700">Type de compte
            <select value={form.role} onChange={(event) => updateForm('role', event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 bg-white px-3">
              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Couleur du profil
            <input type="color" value={form.color} onChange={(event) => updateForm('color', event.currentTarget.value)} className="mt-1 h-11 w-full rounded border border-gray-300 bg-white p-1" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="min-h-11 w-full rounded bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 sm:w-auto">Créer le compte</button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold">Comptes existants <span className="font-normal text-gray-500">({accounts.length})</span></h3>
        <ul className="divide-y divide-gray-200 border-y border-gray-200">
          {accounts.map((account) => (
            <li key={account.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => openEditor(account)}
                aria-label={`Modifier le compte de ${account.name}`}
                className="flex min-w-0 items-center gap-3 rounded text-left hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                {account.profilePicture ? (
                  <img src={account.profilePicture} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ backgroundColor: account.color }}>
                    {account.firstName[0]}{account.lastName[0]}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{account.name}</span>
                  <span className="block truncate text-sm text-gray-600">{account.email}</span>
                </span>
              </button>
              <div className="flex flex-wrap items-center gap-2 sm:pl-12">
                <span className={`min-h-11 rounded px-3 py-2 text-sm font-semibold ${account.role === 'admin' ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                  {account.role === 'admin' ? 'Admin · unique' : roles.find((role) => role.value === account.role)?.label}
                </span>
                <button type="button" disabled={busy || account.role === 'admin'} onClick={() => void removeAccount(account)} className="min-h-11 rounded px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40">Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editingAccount && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy && !regeneratingPassword) {
              setEditingAccount(null);
              setEditForm(null);
            }
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="edit-account-title" className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-lg sm:p-6">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Compte</p>
                <h3 id="edit-account-title" className="mt-1 text-xl font-bold">{editingAccount.name}</h3>
              </div>
              <button type="button" aria-label="Fermer" disabled={busy || regeneratingPassword} onClick={() => { setEditingAccount(null); setEditForm(null); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-gray-100 text-2xl text-gray-700 hover:bg-gray-200 disabled:opacity-50">×</button>
            </header>

            <form onSubmit={saveAccount} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Prénom
                <input required value={editForm.firstName} onChange={(event) => updateEditForm('firstName', event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Nom
                <input required value={editForm.lastName} onChange={(event) => updateEditForm('lastName', event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Adresse courriel
                <input required type="email" value={editForm.email} onChange={(event) => updateEditForm('email', event.currentTarget.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Type de compte
                <select
                  value={editForm.role}
                  disabled={editingAccount.role === 'admin'}
                  onChange={(event) => updateEditForm('role', event.currentTarget.value as User['role'])}
                  className="mt-1 min-h-11 w-full rounded border border-gray-300 bg-white px-3 disabled:opacity-70"
                >
                  {editingAccount.role === 'admin'
                    ? <option value="admin">Admin · unique</option>
                    : roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>
              {dialogError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{dialogError}</p>}
              {dialogNotice && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">{dialogNotice}</p>}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
                <button type="button" disabled={regeneratingPassword} onClick={() => void regeneratePassword()} className="min-h-11 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {regeneratingPassword ? 'Envoi…' : 'Régénérer le mot de passe temporaire'}
                </button>
                <button type="submit" disabled={busy || regeneratingPassword} className="min-h-11 rounded bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Enregistrer</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}