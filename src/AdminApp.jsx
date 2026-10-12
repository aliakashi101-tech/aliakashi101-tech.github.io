import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, isFirebaseConfigured, storage } from './firebase';
import { starterProjects } from './projectData';

const AdminWorkspace = lazy(() => import('./AdminWorkspace'));

const projectCollection = () => collection(db, 'projects');
const emptyProject = (id) => ({
  id, name_en: '', name_ar: '', description_en: '', description_ar: '', tags_en: [], tags_ar: [],
  image: '', photos: [], view_order: 1, app_store: '', app_store_visible: true,
  google_play: '', google_play_visible: true, google_drive: '', google_drive_visible: true,
  website: '', website_visible: true, app_installs: '', collaboration_label_en: '',
  collaboration_label_ar: '', collaboration_description_en: '', collaboration_description_ar: '',
  hidden: false, legacy: false,
});

function Field({ label, value, onChange, multiline = false, type = 'text', ...props }) {
  const common = { value: value ?? '', onChange: (event) => onChange(event.target.value), ...props };
  return <label className="admin-field"><span>{label}</span>{multiline ? <textarea {...common} rows="3" /> : <input type={type} {...common} />}</label>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="admin-toggle"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function Login({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('portfolio-admin-language') === 'ar' ? 'ar' : 'en'; }
    catch { return 'en'; }
  });
  const isArabic = language === 'ar';
  const copy = isArabic ? {
    back: 'العودة إلى الموقع', eyebrow: 'مساحة خاصة', title: 'تسجيل دخول المسؤول',
    description: 'سجّل الدخول لإدارة محتوى معرض أعمالك.', email: 'عنوان البريد الإلكتروني',
    password: 'كلمة المرور', placeholder: 'you@example.com', signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول…', footer: 'تتطلب مساحة العمل هذه حساب Firebase بالبريد الإلكتروني وكلمة المرور.',
    invalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', failed: 'تعذر تسجيل الدخول. حاول مرة أخرى.',
  } : {
    back: 'Back to portfolio', eyebrow: 'PRIVATE WORKSPACE', title: 'Admin sign in',
    description: 'Sign in to manage your portfolio content.', email: 'Email address',
    password: 'Password', placeholder: 'you@example.com', signIn: 'Sign in',
    signingIn: 'Signing in…', footer: 'This workspace requires a Firebase Email/Password account.',
    invalid: 'Email or password is incorrect.', failed: 'Unable to sign in. Please try again.',
  };
  function toggleLanguage() {
    const nextLanguage = isArabic ? 'en' : 'ar';
    setLanguage(nextLanguage);
    try { localStorage.setItem('portfolio-admin-language', nextLanguage); } catch {}
  }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSignedIn();
    } catch (err) { setError(err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' ? copy.invalid : (err?.message || copy.failed)); }
    finally { setBusy(false); }
  }
  return <main className="admin-login" dir={isArabic ? 'rtl' : 'ltr'}>
    <div className="admin-login-wrap">
      <div className="admin-login-topbar">
        <a href="#/" className="admin-back">{isArabic ? `${copy.back} ←` : `← ${copy.back}`}</a>
        <button type="button" className="admin-language-toggle" onClick={toggleLanguage} lang={isArabic ? 'en' : 'ar'}>{isArabic ? 'English' : 'العربية'}</button>
      </div>
      <form onSubmit={submit} className="admin-login-card">
        <div className="admin-login-brand-row">
          <span className="admin-login-logo" aria-label="Ali Akashi">AA</span>
          <svg className="admin-login-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>
        </div>
        <p className="admin-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="admin-login-description">{copy.description}</p>
        <div className="admin-login-fields">
          <label className="admin-login-field"><span>{copy.email}</span><div className="admin-login-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><input type="email" dir="ltr" autoComplete="email" placeholder={copy.placeholder} required value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
          <label className="admin-login-field"><span>{copy.password}</span><input type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        </div>
        <button className="admin-login-submit" disabled={busy}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5.5 5.5v5.8c0 4.4 2.8 7.6 6.5 9.7 3.7-2.1 6.5-5.3 6.5-9.7V5.5L12 3Z"/><path d="m9.5 12 1.7 1.7 3.5-3.8"/></svg>{busy ? copy.signingIn : copy.signIn}</button>
        {error && <p className="admin-login-error" role="alert">{error}</p>}
      </form>
      <p className="admin-login-footer">{copy.footer}</p>
    </div>
  </main>;
}

function ProjectEditor({ project, onClose, onSaved, onError }) {
  const [form, setForm] = useState(project);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function uploadFiles(event) {
    const files = [...(event.target.files || [])]; event.target.value = '';
    const invalid = files.find((file) => !file.type.startsWith('image/') || file.size >= 10 * 1024 * 1024);
    if (invalid) { onError('Choose image files smaller than 10 MB.'); return; }
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-');
        const imageRef = ref(storage, `projects/${form.id}/${crypto.randomUUID()}-${safeName}`);
        await uploadBytes(imageRef, file, { contentType: file.type });
        return getDownloadURL(imageRef);
      }));
      setForm((current) => ({ ...current, photos: [...new Set([...(current.photos || []), ...urls])], image: current.image || urls[0] }));
    } catch (error) { onError(error.message || 'Image upload failed.'); }
    finally { setUploading(false); }
  }
  function removePhoto(url) {
    setForm((current) => ({ ...current, image: current.image === url ? (current.photos.find((photo) => photo !== url) || '') : current.image, photos: current.photos.filter((photo) => photo !== url) }));
    if (url.includes('firebasestorage.googleapis.com')) void deleteObject(ref(storage, url)).catch(() => {});
  }
  async function save(event) {
    event.preventDefault();
    if (!form.name_en.trim() && !form.name_ar.trim()) { onError('Enter a project name in English or Arabic.'); return; }
    for (const key of ['app_store', 'google_play', 'google_drive', 'website']) {
      if (form[key] && !isHttpUrl(form[key])) { onError(`Enter a valid http or https URL for ${key.replaceAll('_', ' ')}.`); return; }
    }
    const installs = String(form.app_installs ?? '').replaceAll(',', '').trim();
    if (installs && (!Number.isFinite(Number(installs)) || Number(installs) < 0)) { onError('Install count must be zero or greater.'); return; }
    setBusy(true); onError('');
    try {
      const payload = { ...form, tags_en: csv(form.tags_en), tags_ar: csv(form.tags_ar), photos: form.photos || [], view_order: Number(form.view_order) || 1, app_installs: installs ? Number(installs) : null, updatedAt: serverTimestamp() };
      delete payload.id;
      delete payload.isNew;
      await setDoc(doc(db, 'projects', form.id), payload, { merge: true });
      await onSaved();
    } catch (error) { onError(error.message || 'Unable to save project.'); }
    finally { setBusy(false); }
  }
  return <form className="admin-editor" onSubmit={save}>
    <div className="admin-editor-heading"><div><p className="admin-eyebrow">PROJECT EDITOR</p><h2>{project.isNew ? 'New project' : 'Edit project'}</h2></div><button type="button" className="admin-secondary" onClick={onClose}>Close</button></div>
    <div className="admin-form-grid"><Field label="Name (English)" value={form.name_en} onChange={(value) => change('name_en', value)} /><Field label="Name (Arabic)" dir="rtl" value={form.name_ar} onChange={(value) => change('name_ar', value)} /><Field label="Description (English)" multiline value={form.description_en} onChange={(value) => change('description_en', value)} /><Field label="Description (Arabic)" dir="rtl" multiline value={form.description_ar} onChange={(value) => change('description_ar', value)} /><Field label="Tags (English, comma separated)" value={csv(form.tags_en)} onChange={(value) => change('tags_en', value)} /><Field label="Tags (Arabic, comma separated)" dir="rtl" value={csv(form.tags_ar)} onChange={(value) => change('tags_ar', value)} /><Field label="Display order" type="number" min="1" value={form.view_order} onChange={(value) => change('view_order', value)} /><Field label="App installs" type="number" min="0" value={form.app_installs} onChange={(value) => change('app_installs', value)} /></div>
    <section className="admin-form-section"><h3>Project images</h3><Field label="Cover image URL" value={form.image} onChange={(value) => change('image', value)} /><label className="admin-upload">{uploading ? 'Uploading…' : 'Upload images'}<input type="file" accept="image/*" multiple disabled={uploading} onChange={uploadFiles} /></label><div className="admin-photo-list">{form.photos.map((photo) => <div className="admin-photo" key={photo}><img src={photo} alt="" /><button type="button" onClick={() => removePhoto(photo)}>Remove</button></div>)}</div></section>
    <section className="admin-form-section"><h3>Links</h3>{[['app_store', 'App Store'], ['google_play', 'Google Play'], ['google_drive', 'Google Drive'], ['website', 'Website']].map(([key, label]) => <div className="admin-link-row" key={key}><Field label={label} type="url" value={form[key]} onChange={(value) => change(key, value)} /><Toggle label="Show link" checked={form[`${key}_visible`]} onChange={(value) => change(`${key}_visible`, value)} /></div>)}</section>
    <section className="admin-form-section"><h3>Collaboration label</h3><div className="admin-form-grid"><Field label="Label (English)" value={form.collaboration_label_en} onChange={(value) => change('collaboration_label_en', value)} /><Field label="Label (Arabic)" dir="rtl" value={form.collaboration_label_ar} onChange={(value) => change('collaboration_label_ar', value)} /><Field label="Description (English)" multiline value={form.collaboration_description_en} onChange={(value) => change('collaboration_description_en', value)} /><Field label="Description (Arabic)" dir="rtl" multiline value={form.collaboration_description_ar} onChange={(value) => change('collaboration_description_ar', value)} /></div></section>
    <section className="admin-form-section admin-toggles"><Toggle label="Publish on portfolio" checked={!form.hidden} onChange={(value) => change('hidden', !value)} /><Toggle label="Legacy project" checked={form.legacy} onChange={(value) => change('legacy', value)} /></section>
    <div className="admin-form-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancel</button><button type="submit" className="admin-primary" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save project'}</button></div>
  </form>;
}

function isHttpUrl(value) { try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; } }
function csv(value) { return Array.isArray(value) ? value.join(', ') : String(value ?? ''); }

function Dashboard({ user, onSignOut }) {
  const [projects, setProjects] = useState([]);
  const [editor, setEditor] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => onSnapshot(projectCollection(), (snapshot) => {
    setProjects(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => Number(a.view_order || 9999) - Number(b.view_order || 9999)));
    setLoading(false);
  }, (err) => { setError(err.message); setLoading(false); }), []);
  async function saved() { setEditor(null); setNotice('Project saved.'); setError(''); }
  function addProject() { setError(''); setEditor({ ...emptyProject(doc(projectCollection()).id), isNew: true }); }
  async function remove(project) {
    if (!window.confirm(`Delete “${project.name_en || project.name_ar}”?`)) return;
    try { await deleteDoc(doc(db, 'projects', project.id)); setNotice('Project deleted.'); setError(''); if (editor?.id === project.id) setEditor(null); }
    catch (err) { setError(err.message); }
  }
  async function importStarter() {
    setError('');
    try {
      const batch = writeBatch(db);
      starterProjects.forEach((project) => { const { id, ...data } = project; batch.set(doc(db, 'projects', id), { ...data, updatedAt: serverTimestamp() }); });
      await batch.commit(); setNotice('Starter projects imported.');
    } catch (err) { setError(err.message); }
  }
  async function move(project, direction) {
    const index = projects.findIndex((item) => item.id === project.id);
    const next = projects[index + direction];
    if (!next) return;
    const batch = writeBatch(db);
    batch.set(doc(db, 'projects', project.id), { view_order: Number(next.view_order || index + 2), updatedAt: serverTimestamp() }, { merge: true });
    batch.set(doc(db, 'projects', next.id), { view_order: Number(project.view_order || index + 1), updatedAt: serverTimestamp() }, { merge: true });
    try { await batch.commit(); setNotice('Project order updated.'); } catch (err) { setError(err.message); }
  }
  return <main className="admin-shell"><header className="admin-header"><a href="#/" className="admin-back">← Portfolio</a><div><p className="admin-eyebrow">ADMIN WORKSPACE</p><h1>Projects</h1></div><div className="admin-account"><span>{user.email}</span><button type="button" className="admin-secondary" onClick={onSignOut}>Sign out</button></div></header>
    <div className="admin-content">{error && <p className="admin-error" role="alert">{error}<button type="button" onClick={() => setError('')}>×</button></p>}{notice && <p className="admin-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')}>×</button></p>}
      {editor ? <ProjectEditor key={editor.id} project={editor} onClose={() => setEditor(null)} onSaved={saved} onError={setError} /> : <>
        <div className="admin-toolbar"><div><h2>Published work</h2><p className="admin-muted">Edit project details, links, images, visibility, and order.</p></div><button type="button" className="admin-primary" onClick={addProject}>＋ Add project</button></div>
        {loading ? <p className="admin-muted">Loading projects…</p> : projects.length === 0 ? <section className="admin-empty"><h2>No projects yet</h2><p>Import your two current portfolio projects to start, or add a project.</p><button type="button" className="admin-primary" onClick={importStarter}>Import starter projects</button></section> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Project</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{projects.map((project, index) => <tr key={project.id}><td>{project.view_order || '—'}</td><td><div className="admin-project-name">{project.image && <img src={project.image} alt="" />}<span>{project.name_en || project.name_ar || 'Untitled project'}</span></div></td><td><span className={project.hidden ? 'admin-status hidden' : 'admin-status'}>{project.hidden ? 'Hidden' : 'Published'}</span></td><td><div className="admin-row-actions"><button type="button" className="admin-secondary" onClick={() => setEditor({ ...emptyProject(project.id), ...project, tags_en: csv(project.tags_en), tags_ar: csv(project.tags_ar), app_installs: project.app_installs ?? '' })}>Edit</button><button type="button" className="admin-secondary" disabled={index === 0} onClick={() => void move(project, -1)} aria-label="Move project up">↑</button><button type="button" className="admin-secondary" disabled={index === projects.length - 1} onClick={() => void move(project, 1)} aria-label="Move project down">↓</button><button type="button" className="admin-danger" onClick={() => void remove(project)}>Delete</button></div></td></tr>)}</tbody></table></div>}
      </>}
    </div></main>;
}

export function AdminApp() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!auth || !db) { setChecking(false); return undefined; }
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) { setUser(null); setChecking(false); return; }
      try {
        const adminRecord = await getDoc(doc(db, 'adminUsers', nextUser.uid));
        if (adminRecord.exists() && adminRecord.data().enabled === true) setUser(nextUser);
        else { await signOut(auth); setUser(null); setMessage('This account is not enabled as a portfolio admin.'); }
      } catch (error) { setUser(null); setMessage(error.message); }
      finally { setChecking(false); }
    });
  }, []);
  if (!isFirebaseConfigured) return <main className="admin-login"><div className="admin-login-card"><a href="#/" className="admin-back">← Back to portfolio</a><h1>Firebase setup needed</h1><p className="admin-muted">Add your Firebase web configuration to the Vite environment before using the project manager. See FIREBASE_SETUP.md.</p></div></main>;
  if (checking) return <main className="admin-login"><p className="admin-muted">Checking admin access…</p></main>;
  if (!user) return <>{message && <p className="admin-global-message" role="status">{message}</p>}<Login onSignedIn={setUser} /></>;
  return <AdminWorkspace
    userEmail={user.email || 'Ali Akashi'}
    onBack={() => { window.location.hash = '/'; }}
    onDataChanged={() => window.dispatchEvent(new CustomEvent('admin-data-updated'))}
    onSignOut={async () => { await signOut(auth); setUser(null); }}
  />;
}
