// Firebase Config - Study Zone By Surojit
const firebaseConfig = {
  apiKey: "AIzaSyCXPuNYHj1rlkmwsPPsxjgeEpIB-7c3bKk",
  authDomain: "study-zone-by-surojit.firebaseapp.com",
  projectId: "study-zone-by-surojit",
  storageBucket: "study-zone-by-surojit.firebasestorage.app",
  messagingSenderId: "1013201829385",
  appId: "1:1013201829385:web:6dca9e64b939d4a38a02d8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 24 24' fill='%231a73e8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

let currentSelectedSubject = "";
let currentPaperFilter = "all";
let currentRoutineStream = "Arts";
let currentRoutineType = "tuition";

let tempEditBase64Image = "";
let tempRegisterBase64Image = "";
let tempAnonBase64Image = "";

let superAdminPasscode = "000000";
const EMERGENCY_MASTER_CODE = "rupai12"; 

let timeTrackerInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    listenToNotice();
    listenToAuthStatus();
    listenToCustomCode();
    listenToAdminPasscode();
    listenToContactInfo();
    loadAppSettings();
    setupTimeTracking();
});

function setupTimeTracking() {
    timeTrackerInterval = setInterval(() => {
        const user = auth.currentUser;
        if (user) {
            db.collection("users").doc(user.uid).set({
                timeSpentSeconds: firebase.firestore.FieldValue.increment(60),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(err => console.log(err));
        }
    }, 60000);
}

// Auth Listener
function listenToAuthStatus() {
    auth.onAuthStateChanged((user) => {
        const authModal = document.getElementById("auth-modal");
        const anonModal = document.getElementById("anon-details-modal");
        
        if (user) {
            authModal.style.display = "none";

            db.collection("users").doc(user.uid).get().then((doc) => {
                if (doc.exists && doc.data().name) {
                    anonModal.style.display = "none";
                    document.getElementById("logout-btn").style.display = "block";
                    document.getElementById("user-info-sidebar").style.display = "block";
                    document.getElementById("nav-profile-btn").style.display = "inline-block";

                    const data = doc.data();
                    document.getElementById("user-name-display").innerText = data.name + (user.isAnonymous ? " (Guest)" : "");
                    document.getElementById("user-email-display").innerText = data.email || "Guest User";
                    document.getElementById("user-avatar").src = data.photo || DEFAULT_AVATAR;

                    logActivity(user.isAnonymous ? "Guest Login" : "User Login", data.email || user.uid);
                } else {
                    anonModal.style.display = "flex";
                }
            }).catch(err => console.log("Profile fetch error:", err));
        } else {
            authModal.style.display = "flex";
            anonModal.style.display = "none";
            document.getElementById("logout-btn").style.display = "none";
            document.getElementById("user-info-sidebar").style.display = "none";
            document.getElementById("nav-profile-btn").style.display = "none";
        }
    });
}

function loginAnonymously() {
    auth.signInAnonymously()
        .then(() => {
            console.log("Logged in anonymously");
        })
        .catch((error) => {
            alert("Anonymous Login Error: " + error.message);
        });
}

function handleAnonPhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempAnonBase64Image = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function saveAnonymousDetails() {
    const name = document.getElementById("anon-fullname").value.trim();
    const school = document.getElementById("anon-school").value.trim();
    const dob = document.getElementById("anon-dob").value;
    const user = auth.currentUser;

    if (!name || !school || !dob) {
        alert("Please fill in Name, School, and Date of Birth!");
        return;
    }

    if (user) {
        db.collection("users").doc(user.uid).set({
            name: name,
            school: school,
            dob: dob,
            email: "Guest User (" + user.uid.substring(0, 5) + ")",
            photo: tempAnonBase64Image || DEFAULT_AVATAR,
            isGuest: true,
            timeSpentSeconds: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            document.getElementById("anon-details-modal").style.display = "none";
            alert("Guest Profile Setup Complete!");
            listenToAuthStatus();
        }).catch(err => alert("Error saving profile: " + err.message));
    }
}

function handleRegisterPhotoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempRegisterBase64Image = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function registerWithEmail() {
    const name = document.getElementById("reg-fullname").value.trim();
    const school = document.getElementById("reg-school").value.trim();
    const dob = document.getElementById("reg-dob").value;
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!name || !school || !dob || !email || !password) {
        alert("Please fill in all required fields!");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((credential) => {
            return db.collection("users").doc(credential.user.uid).set({
                name: name,
                school: school,
                dob: dob,
                email: email,
                photo: tempRegisterBase64Image || DEFAULT_AVATAR,
                timeSpentSeconds: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert("Registration Successful!");
            logActivity("Registered Account", email);
        })
        .catch(err => alert("Error: " + err.message));
}

function loginWithEmail() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert("Enter email and password!");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => alert("Logged in successfully!"))
        .catch(err => alert("Login Failed: " + err.message));
}

function logoutUser() {
    if (auth.currentUser) logActivity("User Logout", auth.currentUser.email || auth.currentUser.uid);
    auth.signOut().then(() => {
        closeSidebar();
        alert("Logged out!");
    });
}

function showRegisterBox() {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("register-box").style.display = "block";
    document.getElementById("auth-title").innerText = "Create Account";
}

function showLoginBox() {
    document.getElementById("register-box").style.display = "none";
    document.getElementById("login-box").style.display = "block";
    document.getElementById("auth-title").innerText = "Welcome to Study Zone";
}

function handleEditImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempEditBase64Image = e.target.result;
            document.getElementById("edit-profile-photo-preview").src = tempEditBase64Image;
        };
        reader.readAsDataURL(file);
    }
}

function updateUserProfile() {
    const name = document.getElementById("edit-profile-name").value.trim();
    const dob = document.getElementById("edit-profile-dob").value.trim();
    const school = document.getElementById("edit-profile-school").value.trim();
    const user = auth.currentUser;

    if (!user) return;

    let updateObj = { name: name, dob: dob, school: school };
    if (tempEditBase64Image) updateObj.photo = tempEditBase64Image;

    db.collection("users").doc(user.uid).update(updateObj).then(() => {
        alert("Profile updated successfully!");
        document.getElementById("user-name-display").innerText = name + (user.isAnonymous ? " (Guest)" : "");
        if (tempEditBase64Image) document.getElementById("user-avatar").src = tempEditBase64Image;
        logActivity("Updated Profile", user.email || user.uid);
    }).catch(err => alert("Error updating profile: " + err.message));
}

function showProfilePage() {
    const user = auth.currentUser;
    if (!user) return;

    hideAllSections();
    document.getElementById("profile-section").style.display = "block";

    db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById("edit-profile-name").value = data.name || "";
            document.getElementById("edit-profile-dob").value = data.dob || "";
            document.getElementById("edit-profile-school").value = data.school || "";
            document.getElementById("edit-profile-photo-preview").src = data.photo || DEFAULT_AVATAR;
        }
    });

    loadUserSubmittedNotes(user.email || user.uid);
}

function loadUserSubmittedNotes(userIdentifier) {
    const container = document.getElementById("user-submitted-notes-list");
    container.innerHTML = "<p>Loading submissions...</p>";

    db.collection("pending_notes").where("submittedBy", "==", userIdentifier).get().then((snap) => {
        if (snap.empty) {
            container.innerHTML = `<p class="info-text">You haven't submitted any notes yet.</p>`;
            return;
        }

        let html = `<table class="data-table"><tr><th>Subject</th><th>Title</th><th>Status</th></tr>`;
        snap.forEach(doc => {
            const sub = doc.data();
            html += `<tr><td><b>${sub.subject}</b></td><td>${sub.name}</td><td style="color:#d93025; font-weight:bold;">⏳ Pending Review</td></tr>`;
        });
        html += `</table>`;
        container.innerHTML = html;
    });
}

function openSubmitNoteModal() { document.getElementById("submit-note-modal").style.display = "flex"; }
function closeSubmitNoteModal() { document.getElementById("submit-note-modal").style.display = "none"; }

function submitNoteForReview() {
    const title = document.getElementById("student-note-title").value.trim();
    const link = document.getElementById("student-note-link").value.trim();
    const user = auth.currentUser;

    if (!title || !link) {
        alert("Please enter title and link!");
        return;
    }

    db.collection("pending_notes").add({
        subject: currentSelectedSubject,
        name: title,
        pdfUrl: link,
        submittedBy: user ? (user.email || "Guest: " + user.uid.substring(0, 5)) : "Anonymous",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Note submitted successfully!");
        logActivity("Submitted Note: " + title, user ? (user.email || user.uid) : "Guest");
        closeSubmitNoteModal();
    });
}

function openAdminModal() {
    document.getElementById("modal-title").innerText = "Main Admin Passcode";
    document.getElementById("admin-modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("admin-modal").style.display = "none";
    document.getElementById("passcode-input").value = "";
}

function verifyPasscode() {
    const inputPasscode = document.getElementById("passcode-input").value.trim();

    if (inputPasscode === EMERGENCY_MASTER_CODE || inputPasscode === superAdminPasscode) {
        openAdminDashboardView();
    } else {
        alert("Incorrect Passcode!");
    }
}

function openAdminDashboardView() {
    closeModal();
    hideAllSections();
    document.getElementById("admin-dashboard").style.display = "block";
    switchAdminTab(null, 'upload-content');
}

function closeAdminDashboard() {
    document.getElementById("admin-dashboard").style.display = "none";
    showSubjects();
}

function switchAdminTab(evt, tabName) {
    document.querySelectorAll('.dash-tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById('tab-' + tabName);
    if (target) target.style.display = 'block';

    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');

    if (tabName === 'manage-users') loadManageUsers();
    else if (tabName === 'activity-log') loadActivityLogs();
    else if (tabName === 'manage-content') loadManageContent();
    else if (tabName === 'review-notes') loadPendingNotesForReview();
    else if (tabName === 'upload-routine') {
        const selectedType = document.getElementById("admin-routine-type").value;
        toggleRoutineChapterField(selectedType);
    }
}

function toggleRoutineChapterField(type) {
    const chapterBox = document.getElementById("routine-chapter-container");
    if (type === 'exam') {
        chapterBox.style.display = "block";
    } else {
        chapterBox.style.display = "none";
    }
}

function addNewContent() {
    const subject = document.getElementById("admin-subject-select").value;
    const title = document.getElementById("chapter-name-input").value.trim();
    const link = document.getElementById("pdf-url-input").value.trim();

    if (!title || !link) return alert("Fill all fields!");

    db.collection("chapters").add({
        subject: subject, name: title, pdfUrl: link,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Note saved successfully!");
        document.getElementById("chapter-name-input").value = "";
        document.getElementById("pdf-url-input").value = "";
    });
}

function addNewQuestionPaper() {
    const category = document.getElementById("admin-paper-category").value;
    const subject = document.getElementById("admin-paper-subject").value;
    const title = document.getElementById("admin-paper-title").value.trim();
    const url = document.getElementById("admin-paper-url").value.trim();

    if (!title || !url) return alert("Fill all fields!");

    db.collection("question_papers").add({
        category: category, subject: subject, title: title, pdfUrl: url,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Question paper uploaded!");
        document.getElementById("admin-paper-title").value = "";
        document.getElementById("admin-paper-url").value = "";
    });
}

function addNewRoutineEntry() {
    const stream = document.getElementById("admin-routine-stream").value;
    const type = document.getElementById("admin-routine-type").value;
    const daydate = document.getElementById("admin-routine-daydate").value.trim();
    const time = document.getElementById("admin-routine-time").value.trim();
    const subject = document.getElementById("admin-routine-subject").value.trim();
    const chapterInput = document.getElementById("admin-routine-chapter");
    const chapter = (type === 'exam' && chapterInput) ? chapterInput.value.trim() : 'N/A';

    if (!daydate || !time || !subject) {
        alert("Please fill in Day/Date, Time, and Subject!");
        return;
    }

    if (type === 'exam' && !chapter) {
        alert("Please specify Chapter / Syllabus details for Exam Routine!");
        return;
    }

    db.collection("exam_routines").add({
        stream: stream,
        type: type,
        daydate: daydate,
        time: time,
        subject: subject,
        chapter: chapter,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Routine entry added successfully!");
        document.getElementById("admin-routine-daydate").value = "";
        document.getElementById("admin-routine-time").value = "";
        document.getElementById("admin-routine-subject").value = "";
        if (chapterInput) chapterInput.value = "";
    });
}

function loadManageContent() {
    const container = document.getElementById("manage-content-list");
    container.innerHTML = "<p>Loading content...</p>";

    Promise.all([
        db.collection("chapters").get(),
        db.collection("question_papers").get(),
        db.collection("exam_routines").get()
    ]).then(([chapSnap, paperSnap, routineSnap]) => {
        let html = `<h4>📖 Subject Notes</h4><table class="data-table"><tr><th>Subject</th><th>Title</th><th>Action</th></tr>`;
        chapSnap.forEach(doc => {
            const item = doc.data();
            html += `<tr><td>${item.subject}</td><td>${item.name}</td><td><button onclick="deleteContentItem('chapters', '${doc.id}')" class="btn-sm btn-danger">Delete</button></td></tr>`;
        });
        html += `</table>`;

        html += `<h4 style="margin-top:20px;">📜 Question Papers</h4><table class="data-table"><tr><th>Category</th><th>Title</th><th>Action</th></tr>`;
        paperSnap.forEach(doc => {
            const item = doc.data();
            html += `<tr><td>${item.category}</td><td>${item.title}</td><td><button onclick="deleteContentItem('question_papers', '${doc.id}')" class="btn-sm btn-danger">Delete</button></td></tr>`;
        });
        html += `</table>`;

        html += `<h4 style="margin-top:20px;">📅 Routines & Exams</h4><table class="data-table"><tr><th>Stream / Type</th><th>Details</th><th>Action</th></tr>`;
        routineSnap.forEach(doc => {
            const item = doc.data();
            html += `<tr><td>${item.stream} (${item.type})</td><td>${item.daydate} - ${item.subject}</td><td><button onclick="deleteContentItem('exam_routines', '${doc.id}')" class="btn-sm btn-danger">Delete</button></td></tr>`;
        });
        html += `</table>`;

        container.innerHTML = html;
    });
}

function deleteContentItem(col, id) {
    if (confirm("Delete this item?")) {
        db.collection(col).doc(id).delete().then(() => loadManageContent());
    }
}

function loadPendingNotesForReview() {
    const container = document.getElementById("pending-notes-container");
    container.innerHTML = "<p>Loading...</p>";

    db.collection("pending_notes").get().then((snap) => {
        if (snap.empty) return container.innerHTML = "<p>No pending notes.</p>";

        let html = `<table class="data-table"><tr><th>Subject</th><th>Title</th><th>By</th><th>Action</th></tr>`;
        snap.forEach(doc => {
            const note = doc.data();
            html += `<tr><td>${note.subject}</td><td>${note.name}</td><td>${note.submittedBy}</td><td>
                <button onclick="approveNote('${doc.id}')" class="btn-sm btn-success">Approve</button>
                <button onclick="deleteContentItem('pending_notes', '${doc.id}')" class="btn-sm btn-danger">Reject</button>
            </td></tr>`;
        });
        container.innerHTML = html + `</table>`;
    });
}

function approveNote(id) {
    db.collection("pending_notes").doc(id).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            db.collection("chapters").add({
                subject: data.subject, name: data.name, pdfUrl: data.pdfUrl,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => db.collection("pending_notes").doc(id).delete().then(() => loadPendingNotesForReview()));
        }
    });
}

function loadManageUsers() {
    const container = document.getElementById("users-list-container");
    container.innerHTML = "<p>Loading users...</p>";

    db.collection("users").get().then(snap => {
        let html = `<table class="data-table"><tr><th>Photo</th><th>Name</th><th>Email / Account</th><th>Action</th></tr>`;
        snap.forEach(doc => {
            const u = doc.data();
            const uid = doc.id;
            html += `<tr>
                <td><img src="${u.photo || DEFAULT_AVATAR}" style="width:35px;height:35px;border-radius:50%;cursor:pointer;" onclick="viewUserFullDetails('${uid}')"></td>
                <td style="cursor:pointer; color:#1a73e8; font-weight:bold;" onclick="viewUserFullDetails('${uid}')">${u.name || 'N/A'} ${u.isGuest ? '<small>(Guest)</small>' : ''}</td>
                <td>${u.email || 'Guest User'}</td>
                <td>
                    <button onclick="viewUserFullDetails('${uid}')" class="btn-sm btn-primary">🔍 Details</button>
                    <button onclick="deleteUserRecord('${uid}')" class="btn-sm btn-danger">Delete</button>
                </td>
            </tr>`;
        });
        container.innerHTML = html + `</table>`;
    });
}

function resetLeaderboardTime() {
    if (confirm("Are you sure you want to reset study time for ALL students in the Leaderboard?")) {
        db.collection("users").get().then(snap => {
            const batch = db.batch();
            snap.forEach(doc => {
                batch.update(doc.ref, { timeSpentSeconds: 0 });
            });
            return batch.commit();
        }).then(() => {
            alert("Leaderboard study time has been reset to 0!");
            loadManageUsers();
            logActivity("Reset Leaderboard Time", auth.currentUser ? auth.currentUser.email : "Admin");
        }).catch(err => alert("Error resetting leaderboard: " + err.message));
    }
}

function viewUserFullDetails(uid) {
    db.collection("users").doc(uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const mins = Math.floor((data.timeSpentSeconds || 0) / 60);
            
            document.getElementById("view-user-photo").src = data.photo || DEFAULT_AVATAR;
            document.getElementById("view-user-name").innerText = (data.name || "N/A") + (data.isGuest ? " (Guest)" : "");
            document.getElementById("view-user-email").innerText = data.email || "Guest Account";
            document.getElementById("view-user-school").innerText = data.school || "N/A";
            document.getElementById("view-user-dob").innerText = data.dob || "N/A";
            document.getElementById("view-user-time").innerText = mins + " minutes";
            
            document.getElementById("user-detail-modal").style.display = "flex";
        }
    });
}

function closeUserDetailModal() {
    document.getElementById("user-detail-modal").style.display = "none";
}

function deleteUserRecord(id) {
    if (confirm("Delete user?")) db.collection("users").doc(id).delete().then(() => loadManageUsers());
}

function loadActivityLogs() {
    const container = document.getElementById("activity-log-container");
    container.innerHTML = "<p>Loading logs...</p>";

    db.collection("activity_logs").orderBy("timestamp", "desc").limit(30).get().then(snap => {
        let html = `<table class="data-table"><tr><th>Action</th><th>User</th><th>Time</th></tr>`;
        snap.forEach(doc => {
            const l = doc.data();
            const time = l.timestamp ? l.timestamp.toDate().toLocaleString() : 'Just now';
            html += `<tr><td><b>${l.action}</b></td><td>${l.userEmail}</td><td>${time}</td></tr>`;
        });
        container.innerHTML = html + `</table>`;
    });
}

function downloadBackup() {
    let backupData = {};
    Promise.all([
        db.collection("chapters").get().then(snap => backupData.chapters = snap.docs.map(d => d.data())),
        db.collection("question_papers").get().then(snap => backupData.question_papers = snap.docs.map(d => d.data())),
        db.collection("exam_routines").get().then(snap => backupData.exam_routines = snap.docs.map(d => d.data()))
    ]).then(() => {
        const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const a = document.createElement('a');
        a.href = str; a.download = "study_zone_backup.json";
        a.click();
    });
}

function restoreBackupData() {
    const file = document.getElementById("backup-file-input").files[0];
    if (!file) return alert("Select a JSON file!");
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = JSON.parse(e.target.result);
        if (data.chapters) data.chapters.forEach(c => db.collection("chapters").add(c));
        if (data.question_papers) data.question_papers.forEach(p => db.collection("question_papers").add(p));
        if (data.exam_routines) data.exam_routines.forEach(r => db.collection("exam_routines").add(r));
        alert("Restored!");
    };
    reader.readAsText(file);
}

function listenToNotice() {
    db.collection("settings").doc("notice").onSnapshot(doc => {
        if (doc.exists && doc.data().text) document.getElementById("announcement-text").innerText = doc.data().text;
    });
}

function updateNotice() {
    const txt = document.getElementById("new-announcement").value.trim();
    if (txt) db.collection("settings").doc("notice").set({ text: txt }).then(() => alert("Notice updated!"));
}

function saveCustomCode() {
    const code = document.getElementById("admin-code-input").value;
    db.collection("settings").doc("custom_code").set({ code: code }).then(() => alert("Published!"));
}

function listenToCustomCode() {
    db.collection("settings").doc("custom_code").onSnapshot(doc => {
        if (doc.exists && doc.data().code) document.getElementById("custom-code-container").innerHTML = doc.data().code;
    });
}

function updateContactInfo() {
    const insta = document.getElementById("edit-insta-1").value.trim();
    db.collection("settings").doc("contact_info").set({ insta1: insta }, { merge: true }).then(() => alert("Contact Updated!"));
}

function listenToContactInfo() {
    db.collection("settings").doc("contact_info").onSnapshot(doc => {
        if (doc.exists) {
            const i1 = doc.data().insta1 || "sanatani_surojit";
            document.getElementById("display-insta-1").innerText = "@" + i1;
            document.getElementById("display-insta-1").href = "https://instagram.com/" + i1;
        }
    });
}

function updateAdminPasscode() {
    const main = document.getElementById("new-passcode-input").value.trim();
    if (main) {
        db.collection("settings").doc("security").set({ passcode: main }, { merge: true }).then(() => alert("Passcode Updated!"));
    }
}

function listenToAdminPasscode() {
    db.collection("settings").doc("security").onSnapshot(doc => {
        if (doc.exists && doc.data().passcode) {
            superAdminPasscode = doc.data().passcode;
        }
    });
}

function openSubject(name) {
    currentSelectedSubject = name;
    document.getElementById("selected-subject-title").innerText = name + " Notes";
    hideAllSections();
    document.getElementById("chapter-section").style.display = "block";
    loadChapters(name);
}

function loadChapters(subject) {
    const container = document.getElementById("chapter-list");
    container.innerHTML = "<p>Loading notes...</p>";
    db.collection("chapters").where("subject", "==", subject).get().then(snap => {
        container.innerHTML = "";
        if (snap.empty) return container.innerHTML = "<p>No notes available.</p>";
        snap.forEach(doc => {
            const d = doc.data();
            container.innerHTML += `<div class="content-card">
                <div><h4>${d.name}</h4><small>Subject: ${d.subject}</small></div>
                <div>
                    <a href="${d.pdfUrl}" target="_blank" class="btn-sm btn-primary">👁️ View</a>
                    <a href="${d.pdfUrl}" download target="_blank" class="btn-sm btn-success">📥 Download</a>
                </div>
            </div>`;
        });
    });
}

function showQuestionPapers() {
    hideAllSections();
    document.getElementById("papers-section").style.display = "block";
    loadQuestionPapers('all');
}

function filterPapers(cat, btn) {
    document.querySelectorAll('.paper-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadQuestionPapers(cat);
}

function loadQuestionPapers(cat) {
    const container = document.getElementById("papers-list-container");
    container.innerHTML = "<p>Loading papers...</p>";
    let query = db.collection("question_papers");
    if (cat !== 'all') query = query.where("category", "==", cat);

    query.get().then(snap => {
        container.innerHTML = "";
        if (snap.empty) return container.innerHTML = "<p>No papers available.</p>";
        snap.forEach(doc => {
            const p = doc.data();
            container.innerHTML += `<div class="sub-card">
                <span class="badge">${p.category} - ${p.subject}</span>
                <h4>${p.title}</h4>
                <div style="margin-top:10px;">
                    <a href="${p.pdfUrl}" target="_blank" class="btn-sm btn-primary">👁️ View</a>
                    <a href="${p.pdfUrl}" download target="_blank" class="btn-sm btn-success">📥 Download</a>
                </div>
            </div>`;
        });
    });
}

function showExamRoutineSection() {
    hideAllSections();
    document.getElementById("routine-section").style.display = "block";
    fetchAndDisplayRoutines();
}

function switchRoutineStream(stream, btn) {
    currentRoutineStream = stream;
    document.querySelectorAll('.stream-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchAndDisplayRoutines();
}

function switchRoutineType(type, btn) {
    currentRoutineType = type;
    document.querySelectorAll('.type-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    fetchAndDisplayRoutines();
}

function fetchAndDisplayRoutines() {
    const container = document.getElementById("routine-list-container");
    container.innerHTML = "<p>Loading...</p>";

    db.collection("exam_routines")
      .where("stream", "==", currentRoutineStream)
      .where("type", "==", currentRoutineType)
      .get()
      .then(snap => {
          container.innerHTML = "";
          if (snap.empty) {
              container.innerHTML = `<p style="text-align:center; color:#666; padding:20px;">No ${currentRoutineType} schedule available for ${currentRoutineStream}.</p>`;
              return;
          }

          let html = `<table class="data-table">`;
          if (currentRoutineType === 'tuition') {
              html += `<tr><th>Day</th><th>Time</th><th>Subjects</th></tr>`;
              snap.forEach(doc => {
                  let r = doc.data();
                  html += `<tr>
                      <td><b>${r.daydate}</b></td>
                      <td>${r.time}</td>
                      <td style="color:#1a73e8; font-weight:bold;">${r.subject}</td>
                  </tr>`;
              });
          } else {
              html += `<tr><th>Date</th><th>Time</th><th>Subject</th><th>Chapter / Syllabus</th></tr>`;
              snap.forEach(doc => {
                  let r = doc.data();
                  html += `<tr>
                      <td><b>${r.daydate}</b></td>
                      <td>${r.time}</td>
                      <td style="color:#1a73e8; font-weight:bold;">${r.subject}</td>
                      <td>${r.chapter}</td>
                  </tr>`;
              });
          }
          html += `</table>`;
          container.innerHTML = html;
      });
}

function showLeaderboardSection() {
    hideAllSections();
    document.getElementById("leaderboard-section").style.display = "block";
    loadLeaderboardData();
}

function loadLeaderboardData() {
    const container = document.getElementById("leaderboard-list-container");
    container.innerHTML = "<p>Loading leaderboard...</p>";

    db.collection("users").orderBy("timeSpentSeconds", "desc").limit(20).get().then(snap => {
        if (snap.empty) return container.innerHTML = "<p>No activity recorded yet.</p>";
        let html = `<table class="data-table"><tr><th>Rank</th><th>Student</th><th>School</th><th>Time Spent</th></tr>`;
        let rank = 1;
        snap.forEach(doc => {
            const u = doc.data();
            const mins = Math.floor((u.timeSpentSeconds || 0) / 60);
            html += `<tr>
                <td><b>#${rank}</b></td>
                <td><img src="${u.photo || DEFAULT_AVATAR}" class="avatar-sm"> ${u.name || 'Student'} ${u.isGuest ? '<small>(Guest)</small>' : ''}</td>
                <td>${u.school || 'N/A'}</td>
                <td><b>${mins} mins</b></td>
            </tr>`;
            rank++;
        });
        container.innerHTML = html + `</table>`;
    });
}

function logActivity(action, userEmail) {
    db.collection("activity_logs").add({
        action: action, 
        userEmail: userEmail || "Guest",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.log("Activity log error:", err));
}

function hideAllSections() {
    document.getElementById("subjects-section").style.display = "none";
    document.getElementById("chapter-section").style.display = "none";
    document.getElementById("papers-section").style.display = "none";
    document.getElementById("routine-section").style.display = "none";
    document.getElementById("profile-section").style.display = "none";
    document.getElementById("settings-section").style.display = "none";
    document.getElementById("contact-section").style.display = "none";
    document.getElementById("leaderboard-section").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "none";
}

function showSubjects() { hideAllSections(); document.getElementById("subjects-section").style.display = "block"; }
function showSettings() { hideAllSections(); document.getElementById("settings-section").style.display = "block"; }
function showContactUs() { hideAllSections(); document.getElementById("contact-section").style.display = "block"; }

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
    document.getElementById("sidebar-overlay").classList.toggle("active");
}

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("active");
    document.getElementById("sidebar-overlay").classList.remove("active");
}

function openAdminFromSidebar() { closeSidebar(); openAdminModal(); }

function navTo(section) {
    closeSidebar();
    if (section === 'subjects') showSubjects();
    else if (section === 'papers') showQuestionPapers();
    else if (section === 'routine') showExamRoutineSection();
    else if (section === 'leaderboard') showLeaderboardSection();
    else if (section === 'profile') showProfilePage();
    else if (section === 'settings') showSettings();
    else if (section === 'contact') showContactUs();
}

function toggleDarkMode(isDark) {
    if (isDark) { document.body.classList.add("dark-mode"); localStorage.setItem("theme", "dark"); }
    else { document.body.classList.remove("dark-mode"); localStorage.setItem("theme", "light"); }
}

function loadAppSettings() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        if (document.getElementById("dark-mode-toggle")) document.getElementById("dark-mode-toggle").checked = true;
    }
}