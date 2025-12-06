import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { adminService } from '../services/adminService'
import { useAuth } from '../context/AuthContext'

export default function AdminUsers() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [banningUser, setBanningUser] = useState<any>(null)
  const [banReason, setBanReason] = useState('')
  const [modal, setModal] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type?: 'success' | 'error' | 'info' | 'warning'
    onConfirm?: () => void
  }>({
    isOpen: false,
    message: ''
  })

  useEffect(() => {
    if (!user || (user.role !== 'admin1' && user.role !== 'admin2')) {
      navigate('/login')
      return
    }
    loadUsers()
  }, [user, navigate, search, roleFilter, showDeleted])

  const loadUsers = async () => {
    try {
      const response = await adminService.getUsers({ 
        search, 
        role: roleFilter,
        includeDeleted: showDeleted 
      })
      setUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      await adminService.updateUser(userId, updates)
      setEditingUser(null)
      loadUsers()
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'User updated successfully',
        type: 'success'
      })
    } catch (error) {
      console.error('Error updating user:', error)
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Error updating user',
        type: 'error'
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this user?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await adminService.deleteUser(userId)
          loadUsers()
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'User deleted successfully',
            type: 'success'
          })
        } catch (error) {
          console.error('Error deleting user:', error)
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'Error deleting user',
            type: 'error'
          })
        }
      }
    })
  }

  const handleRestoreUser = async (userId: string, userName: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Restore',
      message: `Restore ${userName}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await adminService.restoreUser(userId)
          loadUsers()
          setModal({
            isOpen: true,
            title: 'Success',
            message: `${userName} has been restored`,
            type: 'success'
          })
        } catch (error) {
          console.error('Error restoring user:', error)
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'Error restoring user',
            type: 'error'
          })
        }
      }
    })
  }

  const handlePromoteToAdmin1 = async (userId: string, userName: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Promotion',
      message: `Promote ${userName} to Admin1?\n\nAdmin1 can:\n• Create, Read, Update records\n• Manage users & products\n• Ban/unban users\n• Resolve disputes`,
      type: 'info',
      onConfirm: async () => {
        try {
          await adminService.updateUser(userId, { role: 'admin1' })
          loadUsers()
          setModal({
            isOpen: true,
            title: 'Success',
            message: `${userName} has been promoted to Admin1`,
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error promoting user:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error promoting user'
          setModal({
            isOpen: true,
            title: 'Error',
            message: `Failed to promote user: ${errorMessage}`,
            type: 'error'
          })
        }
      }
    })
  }

  const handlePromoteToAdmin2 = async (userId: string, userName: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Promotion to Admin2',
      message: `Promote ${userName} to Admin2?\n\nAdmin2 has FULL CONTROL:\n• All Admin1 permissions\n• Can CREATE, READ, UPDATE, DELETE (CRUD)\n• Can delete records permanently\n• Can promote others to Admin2\n• Can restore deleted records\n• Highest level of access`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await adminService.updateUser(userId, { role: 'admin2' })
          loadUsers()
          setModal({
            isOpen: true,
            title: 'Success',
            message: `${userName} has been promoted to Admin2 with full system access`,
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error promoting user:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error promoting user'
          setModal({
            isOpen: true,
            title: 'Error',
            message: `Failed to promote user: ${errorMessage}`,
            type: 'error'
          })
        }
      }
    })
  }

  const handleDemoteToUser = async (userId: string, userName: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Demotion',
      message: `Demote ${userName} back to regular user?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await adminService.updateUser(userId, { role: 'user' })
          loadUsers()
          setModal({
            isOpen: true,
            title: 'Success',
            message: `${userName} has been demoted to regular user`,
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error demoting user:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error demoting user'
          setModal({
            isOpen: true,
            title: 'Error',
            message: `Failed to demote user: ${errorMessage}`,
            type: 'error'
          })
        }
      }
    })
  }

  const handleDemoteAdmin2ToAdmin1 = async (userId: string, userName: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Demotion',
      message: `Demote ${userName} from Admin2 to Admin1?\n\nThey will lose:\n• Delete permissions\n• Ability to promote to Admin2\n• Access to deleted records`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await adminService.updateUser(userId, { role: 'admin1' })
          loadUsers()
          setModal({
            isOpen: true,
            title: 'Success',
            message: `${userName} has been demoted to Admin1`,
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error demoting user:', error)
          const errorMessage = error.response?.data?.message || error.message || 'Error demoting user'
          setModal({
            isOpen: true,
            title: 'Error',
            message: `Failed to demote user: ${errorMessage}`,
            type: 'error'
          })
        }
      }
    })
  }

  const handleBanUser = async () => {
    if (!banningUser || !banReason.trim()) {
      setModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please provide a ban reason',
        type: 'warning'
      })
      return
    }

    try {
      await adminService.banUser(banningUser._id, banReason)
      setBanningUser(null)
      setBanReason('')
      loadUsers()
      setModal({
        isOpen: true,
        title: 'Success',
        message: 'User banned successfully',
        type: 'success'
      })
    } catch (error: any) {
      console.error('Error banning user:', error)
      setModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Error banning user',
        type: 'error'
      })
    }
  }

  const handleUnbanUser = async (userId: string, userName: string) => {
    setModal({
      isOpen: true,
      title: 'Confirm Unban',
      message: `Are you sure you want to unban ${userName}?`,
      type: 'info',
      onConfirm: async () => {
        try {
          await adminService.unbanUser(userId)
          loadUsers()
          setModal({
            isOpen: true,
            title: 'Success',
            message: 'User unbanned successfully',
            type: 'success'
          })
        } catch (error: any) {
          console.error('Error unbanning user:', error)
          setModal({
            isOpen: true,
            title: 'Error',
            message: error.response?.data?.message || 'Error unbanning user',
            type: 'error'
          })
        }
      }
    })
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="container">
          <p className="muted" style={{ textAlign: 'center', padding: '4rem' }}>Loading...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      
      <main className="container">
        <header className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1>User Management</h1>
              <p className="muted">
                {user?.role === 'admin2' 
                  ? 'Manage users, ban accounts, and promote to admin1 or admin2' 
                  : 'Manage users, ban accounts, and promote to admin1'
                }
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {user?.role === 'admin2' && (
                <Link to="/admin/create-admin" className="btn btn-primary">+ Create Admin</Link>
              )}
              <Link to="/admin" className="btn btn-ghost">← Dashboard</Link>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Search Users</label>
              <input
                type="text"
                className="input"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Filter by Role</label>
              <select
                className="input"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin1">Admin1</option>
                <option value="admin2">Admin2</option>
              </select>
            </div>
          </div>
          {user?.role === 'admin2' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Show Deleted Users (Archive)</span>
              </label>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-primary)', color: 'white' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Verified</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Joined</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ 
                  borderBottom: '1px solid var(--color-border)',
                  background: u.isDeleted ? '#f3f4f6' : 'transparent',
                  opacity: u.isDeleted ? 0.7 : 1
                }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                    {u.firstName} {u.lastName}
                    {u.isDeleted && <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontSize: '0.75rem' }}>(DELETED)</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: u.role === 'admin2' ? '#fef2f2' : u.role === 'admin1' ? '#fff7ed' : '#eff6ff',
                      color: u.role === 'admin2' ? '#991b1b' : u.role === 'admin1' ? '#9a3412' : '#1e40af',
                      border: `1px solid ${u.role === 'admin2' ? '#fecaca' : u.role === 'admin1' ? '#fed7aa' : '#bfdbfe'}`
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {u.isBanned ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: '#fef2f2',
                        color: '#991b1b',
                        border: '1px solid #fecaca'
                      }}>
                        🚫 Banned
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: '#d1fae5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0'
                      }}>
                        ✓ Active
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {u.isEmailVerified ? '✅' : '❌'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} className="muted">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button onClick={() => setEditingUser(u)} className="btn btn-sm btn-ghost">
                        Edit
                      </button>
                      
                      {/* Ban/Unban buttons - admins can ban anyone except themselves */}
                      {!u.isDeleted && u._id !== user?.id && (
                        <>
                          {u.isBanned ? (
                            <button
                              onClick={() => handleUnbanUser(u._id, `${u.firstName} ${u.lastName}`)}
                              className="btn btn-sm"
                              style={{ background: '#10b981', color: 'white' }}
                            >
                              ✓ Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanningUser(u)}
                              className="btn btn-sm"
                              style={{ background: '#f59e0b', color: 'white' }}
                            >
                              🚫 Ban
                            </button>
                          )}
                        </>
                      )}
                      
                      {/* Promote/Demote buttons (admin2 only) */}
                      {user?.role === 'admin2' && !u.isDeleted && (
                        <>
                          {u.role === 'user' && (
                            <button
                              onClick={() => handlePromoteToAdmin1(u._id, `${u.firstName} ${u.lastName}`)}
                              className="btn btn-sm"
                              style={{ background: 'var(--color-primary)', color: 'white' }}
                            >
                              ⬆️ Admin1
                            </button>
                          )}
                          {u.role === 'admin1' && (
                            <>
                              <button
                                onClick={() => handlePromoteToAdmin2(u._id, `${u.firstName} ${u.lastName}`)}
                                className="btn btn-sm"
                                style={{ background: '#dc2626', color: 'white' }}
                              >
                                ⬆️⬆️ Admin2
                              </button>
                              <button
                                onClick={() => handleDemoteToUser(u._id, `${u.firstName} ${u.lastName}`)}
                                className="btn btn-sm"
                                style={{ background: '#64748b', color: 'white' }}
                              >
                                ⬇️ User
                              </button>
                            </>
                          )}
                          {u.role === 'admin2' && u._id !== user?.id && (
                            <button
                              onClick={() => handleDemoteAdmin2ToAdmin1(u._id, `${u.firstName} ${u.lastName}`)}
                              className="btn btn-sm"
                              style={{ background: '#f59e0b', color: 'white' }}
                            >
                              ⬇️ Admin1
                            </button>
                          )}
                        </>
                      )}
                      {user?.role === 'admin2' && u._id !== user?.id && (
                        <>
                          {u.isDeleted ? (
                            <button
                              onClick={() => handleRestoreUser(u._id, `${u.firstName} ${u.lastName}`)}
                              className="btn btn-sm"
                              style={{ background: '#10b981', color: 'white' }}
                            >
                              ♻️ Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              className="btn btn-sm"
                              style={{ background: 'var(--color-error)', color: 'white' }}
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <p className="muted">No users found</p>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Edit User</h2>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                className="input"
                value={editingUser.firstName}
                onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                className="input"
                value={editingUser.lastName}
                onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                className="input"
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                disabled={user?.role !== 'admin2'}
              >
                <option value="user">User</option>
                <option value="admin1">Admin1</option>
                <option value="admin2">Admin2</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setEditingUser(null)} className="btn btn-ghost">Cancel</button>
              <button
                onClick={() => handleUpdateUser(editingUser._id, {
                  firstName: editingUser.firstName,
                  lastName: editingUser.lastName,
                  role: editingUser.role
                })}
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banningUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-error)' }}>Ban User</h2>
            <p style={{ marginBottom: '1rem' }}>
              You are about to ban <strong>{banningUser.firstName} {banningUser.lastName}</strong>.
              They will not be able to log in until unbanned.
            </p>
            <div className="form-group">
              <label>Ban Reason *</label>
              <textarea
                className="textarea"
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter the reason for banning this user..."
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => { setBanningUser(null); setBanReason('') }} className="btn btn-ghost">Cancel</button>
              <button
                onClick={handleBanUser}
                className="btn"
                style={{ background: 'var(--color-error)', color: 'white' }}
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false, onConfirm: undefined })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.onConfirm ? 'Yes, Confirm' : 'OK'}
        cancelText="Cancel"
      />
    </>
  )
}
