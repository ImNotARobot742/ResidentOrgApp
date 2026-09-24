import { useState, useEffect } from 'react';
import { Tool } from '../../../shared/types';
import { getTools, createTool, deleteTool, getToolBorrows, borrowTool, returnTool } from '../api';
import { useUser } from '../context/UserContext';

export default function BorrowedTools() {
  const { currentUser } = useUser();
  const [tools, setTools] = useState<Tool[]>([]);
  const [borrows, setBorrows] = useState<any[]>([]);
  const [newToolName, setNewToolName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTools();
    loadBorrows();
  }, []);

  const loadTools = async () => {
    try {
      const res = await getTools();
      setTools(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des outils :', err);
    }
  };

  const loadBorrows = async () => {
    try {
      const res = await getToolBorrows();
      setBorrows(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des emprunts :', err);
    }
  };

  const handleAddTool = async () => {
    if (!newToolName.trim()) return;
    setLoading(true);
    try {
      await createTool(newToolName);
      setNewToolName('');
      loadTools();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erreur lors de l'ajout de l'outil");
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowTool = async (toolId: number) => {
    if (!currentUser) {
      alert("Veuillez d'abord sélectionner un utilisateur");
      return;
    }
    try {
      await borrowTool(toolId, currentUser.id);
      loadBorrows();
      loadTools();
    } catch (err) {
      console.error("Erreur lors de l'emprunt de l'outil :", err);
    }
  };

  const handleReturnTool = async (borrowId: number) => {
    try {
      await returnTool(borrowId);
      loadBorrows();
      loadTools();
    } catch (err) {
      console.error("Erreur lors de la restitution de l'outil :", err);
    }
  };

  const handleDeleteTool = async (toolId: number) => {
    try {
      await deleteTool(toolId);
      loadTools();
      loadBorrows();
    } catch (err) {
      console.error("Erreur lors de la suppression de l'outil :", err);
    }
  };

  const getToolBorrow = (toolId: number) => borrows.find((b) => b.toolId === toolId);

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-6">Outils empruntés</h2>

      {/* Currently Borrowed */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Emprunts en cours</h3>
        {borrows.length === 0 ? (
          <p className="text-gray-500">Aucun outil actuellement emprunté</p>
        ) : (
          <div className="space-y-2">
            {borrows.map((borrow) => (
              <div
                key={borrow.id}
                className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center"
              >
                <div>
                  <p className="font-semibold">{borrow.toolName}</p>
                  <p className="text-sm text-gray-600">
                    Emprunté par{' '}
                    <span style={{ color: borrow.color }} className="font-semibold">
                      {borrow.userName}
                    </span>{' '}
                    le {new Date(borrow.borrowDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {currentUser?.id === borrow.userId && (
                  <button
                    onClick={() => handleReturnTool(borrow.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Restituer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Tools */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Outils disponibles</h3>
        <div className="space-y-2 mb-4">
          {tools
            .filter((tool) => !getToolBorrow(tool.id))
            .map((tool) => (
              <div
                key={tool.id}
                className="p-4 bg-green-50 border-2 border-green-200 rounded flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center"
              >
                <p className="font-semibold">{tool.name}</p>
                <div className="flex flex-wrap gap-2">
                    <button
                    onClick={() => handleBorrowTool(tool.id)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 sm:flex-none"
                  >
                    Emprunter
                  </button>
                  <button
                    onClick={() => handleDeleteTool(tool.id)}
                    className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 rounded sm:flex-none"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Add New Tool */}
        <div className="p-4 border-2 border-gray-300 rounded">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Nom de l'outil"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTool()}
              className="flex-1 p-2 border-2 border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddTool}
              disabled={loading || !newToolName.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Ajout...' : '+ Ajouter un outil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
