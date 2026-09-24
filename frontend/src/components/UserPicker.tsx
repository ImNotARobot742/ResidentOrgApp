import { User } from '../../../shared/types';

interface UserPickerProps {
  users: User[];
  onUserSelected: (user: User) => void;
}

export default function UserPicker({ users, onUserSelected }: UserPickerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-md w-[calc(100%-2rem)] sm:w-full">
        <h2 className="text-2xl font-bold mb-4">Sélectionnez votre nom</h2>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onUserSelected(user)}
              className="w-full p-3 text-left rounded border-2 border-gray-200 hover:border-blue-500 transition flex items-center gap-3"
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: user.color }}
              />
              <span>{user.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
