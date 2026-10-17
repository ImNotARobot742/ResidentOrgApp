import { ChangeEvent, useState } from 'react';
import { useUser } from '../context/UserContext';

const roleNames = { admin: 'Administrateur', artisan: 'Artisan', institut: 'Institut' };

export default function MyAccount() {
  const { currentUser, updateProfilePicture } = useUser();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const updatePicture = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 300_000) {
      setMessage('Choisissez une image de 300 Ko maximum.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setSaving(true);
      try {
        await updateProfilePicture(String(reader.result));
        setMessage('Photo de profil mise à jour.');
      } catch {
        setMessage('La photo n’a pas pu être enregistrée.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePicture = async () => {
    setSaving(true);
    try {
      await updateProfilePicture(null);
      setMessage('Photo de profil supprimée.');
    } catch {
      setMessage('La photo n’a pas pu être supprimée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h2 className="text-xl font-bold sm:text-2xl">Mon compte</h2>
        <p className="mt-1 text-sm text-gray-600">Informations de votre compte Org’atelier.</p>
      </header>

      <section className="border-b border-gray-200 pb-6">
        <h3 className="mb-4 font-semibold">Photo de profil</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {currentUser.profilePicture ? (
            <img src={currentUser.profilePicture} alt={`Photo de ${currentUser.name}`} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold text-white" style={{ backgroundColor: currentUser.color }}>
              {currentUser.firstName[0]}{currentUser.lastName[0]}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex min-h-11 cursor-pointer items-center rounded bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 ${saving ? 'pointer-events-none opacity-50' : ''}`}>
              Choisir une photo
              <input type="file" accept="image/*" onChange={updatePicture} disabled={saving} className="sr-only" />
            </label>
            {currentUser.profilePicture && (
              <button type="button" disabled={saving} onClick={() => void removePicture()} className="min-h-11 rounded border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Supprimer la photo
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Image JPG, PNG ou WebP, 300 Ko maximum.</p>
        {message && <p role="status" className="mt-3 text-sm text-gray-700">{message}</p>}
      </section>

      <section>
        <h3 className="mb-4 font-semibold">Informations du compte</h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-gray-500">Prénom</dt>
            <dd className="mt-1 font-medium">{currentUser.firstName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Nom</dt>
            <dd className="mt-1 font-medium">{currentUser.lastName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Adresse courriel</dt>
            <dd className="mt-1 break-all font-medium">{currentUser.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Type de compte</dt>
            <dd className="mt-1 font-medium">{roleNames[currentUser.role]}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}