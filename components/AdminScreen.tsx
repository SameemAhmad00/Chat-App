
import React, { useState, useEffect, useMemo } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import { db } from '../services/firebase';
import type { UserProfile } from '../types';
import { BackIcon, ShieldCheckIcon, TrashIcon, EyeIcon, CheckIcon, CancelIcon, ArrowUpIcon, ArrowDownIcon, PencilIcon, UsersIcon } from './Icons';
import Avatar from './Avatar';
import type { NavigationState } from '../App';

interface AdminScreenProps {
  currentUserProfile: UserProfile;
  onBack: () => void;
  onNavigate: (state: NavigationState) => void;
}

type SortableKeys = 'name' | 'email' | 'isAdmin' | 'isBlockedByAdmin';
type SortDirection = 'ascending' | 'descending';

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: number | string; color: string }> = ({ icon, title, value, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
    <div className={`p-3 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  </div>
);

const UserSignupChart: React.FC<{ data: number[] }> = ({ data }) => {
    const maxValue = Math.max(...data, 1); // Avoid division by zero
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = new Date().getDay();
    const labels = Array(7).fill(0).map((_, i) => days[(todayIndex - 6 + i + 7) % 7]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">New Users (Last 7 Days)</h3>
            <div className="flex justify-around items-end h-48 space-x-2">
                {data.map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{value}</div>
                        <div
                            className="w-full bg-green-200 dark:bg-green-700 rounded-t-md hover:bg-green-400 dark:hover:bg-green-500 transition-colors"
                            style={{ height: `${(value / maxValue) * 100}%` }}
                            title={`${value} users`}
                        ></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">{labels[index]}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AdminScreen: React.FC<AdminScreenProps> = ({ currentUserProfile, onBack, onNavigate }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'name', direction: 'ascending' });
  const [editingUser, setEditingUser] = useState<{ uid: string; newUsername: string } | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalAdmins: 0, totalBlocked: 0 });
  const [signupData, setSignupData] = useState<number[]>(Array(7).fill(0));


  useEffect(() => {
    // FIX: Use compat version of ref and onValue.
    const usersRef = db.ref('users');
    const unsubscribeUsers = usersRef.on('value', (snapshot) => {
      const usersData = snapshot.val() || {};
      const usersList: UserProfile[] = Object.values(usersData);
      setUsers(usersList);

      setStats(prev => ({
          ...prev,
          totalUsers: usersList.length,
          totalAdmins: usersList.filter(u => u.isAdmin).length,
          totalBlocked: usersList.filter(u => u.isBlockedByAdmin).length
      }));

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const dailySignups = Array(7).fill(0);
      usersList.forEach(user => {
          if (user.createdAt) {
              const signupDate = new Date(user.createdAt);
              const diffDays = Math.floor((today.getTime() - signupDate.getTime()) / (1000 * 3600 * 24));
              if (diffDays >= 0 && diffDays < 7) {
                  dailySignups[6 - diffDays]++;
              }
          }
      });
      setSignupData(dailySignups);
      setIsLoading(false);
    });

    // FIX: Use compat version of ref and onValue.
    const presenceRef = db.ref('presence');
    const unsubscribePresence = presenceRef.on('value', (snapshot) => {
        const presences = snapshot.val() || {};
        const activeCount = Object.values(presences).filter(p => p === 'online').length;
        setStats(prev => ({ ...prev, activeUsers: activeCount }));
    });


    return () => {
      usersRef.off('value', unsubscribeUsers);
      presenceRef.off('value', unsubscribePresence);
    };
  }, []);

  const handleToggleAdmin = (uid: string, currentStatus: boolean) => {
    if (uid === currentUserProfile.uid) {
      alert("You cannot change your own admin status.");
      return;
    }
    // FIX: Use compat version of ref and update.
    db.ref(`users/${uid}`).update({ isAdmin: !currentStatus });
  };

  const handleToggleBlock = (uid: string, currentStatus: boolean) => {
     if (uid === currentUserProfile.uid) {
      alert("You cannot block yourself.");
      return;
    }
    // FIX: Use compat version of ref and update.
    db.ref(`users/${uid}`).update({ isBlockedByAdmin: !currentStatus });
  };

  const handleDeleteUser = (userToDelete: UserProfile) => {
     if (userToDelete.uid === currentUserProfile.uid) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete user @${userToDelete.username}? This action cannot be undone.`)) {
        const updates: { [key: string]: null } = {};
        updates[`/users/${userToDelete.uid}`] = null;
        if (userToDelete.username) {
            updates[`/usernames/${userToDelete.username.toLowerCase()}`] = null;
        }
        // FIX: Use compat version of ref and update.
        db.ref().update(updates);
    }
  };
  
  const handleUpdateUsername = async (userToUpdate: UserProfile) => {
    if (!editingUser || editingUser.uid !== userToUpdate.uid) return;

    const newUsername = editingUser.newUsername.trim();
    const oldUsername = userToUpdate.username;

    if (newUsername === oldUsername) {
        setEditingUser(null);
        return;
    }
    
    if (!oldUsername) {
        alert("Cannot update username for a user with no existing username.");
        setEditingUser(null);
        return;
    }

    if (!/^[a-z0-9_.]{3,20}$/.test(newUsername)) {
        alert('Invalid username format. Must be 3-20 characters long and can only contain lowercase letters, numbers, underscores, and periods.');
        return;
    }

    try {
        // FIX: Use compat version of ref and get.
        const usernameRef = db.ref(`usernames/${newUsername.toLowerCase()}`);
        const snapshot = await usernameRef.get();
        if (snapshot.exists()) {
            alert('This username is already taken.');
            return;
        }

        const updates: { [key: string]: any } = {};
        updates[`/users/${userToUpdate.uid}/username`] = newUsername;
        updates[`/usernames/${oldUsername.toLowerCase()}`] = null;
        updates[`/usernames/${newUsername.toLowerCase()}`] = { uid: userToUpdate.uid };

        // FIX: Use compat version of ref and update.
        await db.ref().update(updates);
        alert('Username updated successfully.');
        setEditingUser(null);
    } catch (error) {
        console.error("Error updating username:", error);
        alert('Failed to update username. Please try again.');
    }
  };

  const sortedAndFilteredUsers = useMemo(() => {
    let sortableUsers = [...users];
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      sortableUsers = sortableUsers.filter(user =>
        (user.name || '').toLowerCase().includes(lowercasedFilter) ||
        (user.username || '').toLowerCase().includes(lowercasedFilter) ||
        (user.email || '').toLowerCase().includes(lowercasedFilter)
      );
    }
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableUsers;
  }, [users, searchTerm, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader: React.FC<{ sortKey: SortableKeys, children: React.ReactNode }> = ({ sortKey, children }) => {
    const isSorted = sortConfig?.key === sortKey;
    const direction = sortConfig?.direction;
    return (
        <th scope="col" onClick={() => requestSort(sortKey)} className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700">
            <div className="flex items-center">
                {children}
                {isSorted && (direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4 ml-1" /> : <ArrowDownIcon className="w-4 h-4 ml-1" />)}
            </div>
        </th>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-black text-gray-800 dark:text-gray-100 p-3 flex items-center shadow-sm z-10 shrink-0">
        <button onClick={onBack} aria-label="Back to main screen" className="p-2 text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          <BackIcon className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg ml-3">Admin Dashboard</h2>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<UsersIcon className="w-6 h-6 text-white"/>} title="Total Users" value={stats.totalUsers} color="bg-blue-500"/>
          <StatCard icon={<CheckIcon className="w-6 h-6 text-white"/>} title="Active Now" value={stats.activeUsers} color="bg-green-500"/>
          <StatCard icon={<ShieldCheckIcon className="w-6 h-6 text-white"/>} title="Admins" value={stats.totalAdmins} color="bg-indigo-500"/>
          <StatCard icon={<CancelIcon className="w-6 h-6 text-white"/>} title="Blocked" value={stats.totalBlocked} color="bg-red-500"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <UserSignupChart data={signupData} />
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">User Management</h3>
                    <div className="w-full sm:w-1/2 md:w-1/3">
                        <input
                            type="text"
                            placeholder="Search users..."
                            aria-label="Search users"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 border border-gray-200 dark:border-gray-600 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                      <div className="text-center p-4 text-gray-500 dark:text-gray-400">Loading...</div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                  <SortableHeader sortKey="name">User</SortableHeader>
                                  <SortableHeader sortKey="email">Email</SortableHeader>
                                  <SortableHeader sortKey="isAdmin">Admin</SortableHeader>
                                  <SortableHeader sortKey="isBlockedByAdmin">Blocked</SortableHeader>
                                  <th scope="col" className="p-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {sortedAndFilteredUsers.map(user => {
                                  const isEditingThisUser = editingUser?.uid === user.uid;
                                  return (
                                      <tr key={user.uid} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isEditingThisUser ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                          <td className="p-3 whitespace-nowrap">
                                              <div className="flex items-center">
                                                  <Avatar photoURL={user.photoURL} username={user.username || ''} className="w-10 h-10" />
                                                  <div className="ml-3">
                                                      <p className="font-bold text-gray-900 dark:text-gray-100">{user.name}</p>
                                                      {isEditingThisUser ? (
                                                        <div className="flex items-center mt-1"><span className="text-sm text-gray-600 dark:text-gray-300">@</span><input type="text" value={editingUser.newUsername} onChange={(e) => setEditingUser({ ...editingUser, newUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })} className="w-full p-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateUsername(user)} /></div>
                                                      ) : (
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">@{user.username}</p>
                                                      )}
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="p-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.email}</td>
                                          <td className="p-3 whitespace-nowrap text-center">{user.isAdmin ? <CheckIcon className="w-5 h-5 text-green-500 mx-auto" /> : <CancelIcon className="w-5 h-5 text-red-500 mx-auto opacity-50" />}</td>
                                          <td className="p-3 whitespace-nowrap text-center">{user.isBlockedByAdmin ? <CheckIcon className="w-5 h-5 text-yellow-500 mx-auto" /> : <CancelIcon className="w-5 h-5 text-red-500 mx-auto opacity-50" />}</td>
                                          <td className="p-3 whitespace-nowrap text-sm font-medium">
                                              <div className="flex items-center space-x-1">{isEditingThisUser ? (<><button onClick={() => handleUpdateUsername(user)} className="p-2 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full" aria-label={`Save username for ${user.username}`}><CheckIcon className="w-5 h-5" /></button><button onClick={() => setEditingUser(null)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" aria-label="Cancel username edit"><CancelIcon className="w-5 h-5" /></button></>) : (<><button onClick={() => onNavigate({ view: 'adminChatViewer', viewedUser: user })} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full" aria-label={`View chats for ${user.username}`}><EyeIcon className="w-5 h-5" /></button><button onClick={() => setEditingUser({ uid: user.uid, newUsername: user.username || '' })} className="p-2 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-full" aria-label={`Edit username for ${user.username}`}><PencilIcon className="w-5 h-5" /></button><button onClick={() => handleToggleAdmin(user.uid, !!user.isAdmin)} className="p-2 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full disabled:opacity-30 disabled:hover:bg-transparent" disabled={user.uid === currentUserProfile.uid} aria-label={user.isAdmin ? `Remove admin status from ${user.username}` : `Make ${user.username} an admin`}><ShieldCheckIcon className="w-5 h-5" /></button><button onClick={() => handleToggleBlock(user.uid, !!user.isBlockedByAdmin)} className="p-2 text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded-full disabled:opacity-30 disabled:hover:bg-transparent" disabled={user.uid === currentUserProfile.uid} aria-label={user.isBlockedByAdmin ? `Unblock ${user.username}` : `Block ${user.username}`}><CheckIcon className="w-5 h-5" /></button><button onClick={() => handleDeleteUser(user)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:opacity-30 disabled:hover:bg-transparent" disabled={user.uid === currentUserProfile.uid} aria-label={`Delete user ${user.username}`}><TrashIcon className="w-5 h-5" /></button></>)}</div>
                                          </td>
                                      </tr>
                                  )
                              })}
                          </tbody>
                      </table>
                    )}
                </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminScreen;
