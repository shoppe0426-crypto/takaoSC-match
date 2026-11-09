import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 画像から取得したShoheiさんのFirebase設定を反映済みです
const firebaseConfig = {
    apiKey: "AIzaSyDoLQhgpQKKq8oGpkKq8o",
    authDomain: "takao-sc-match.firebaseapp.com",
    projectId: "takao-sc-match",
    storageBucket: "takao-sc-match.appspot.com",
    messagingSenderId: "1032352956906",
    appId: "1:1032352956906:web:310dfa13812a9fbb3d3293",
    measurementId: "G-GTX64FCQ2B"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MAX_SCORERS = 10;
let currentScorerCount = 0;
let matches = []; 
let editingMatchId = null; 

const scorerContainer = document.getElementById('scorer-container');
const formTitle = document.getElementById('form-title');
const btnSubmitMatch = document.getElementById('btn-submit-match');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

// 試合の種類切り替え
document.querySelectorAll('input[name="match-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        toggleTournamentInput(e.target.value);
    });
});

function toggleTournamentInput(type) {
    const group = document.getElementById('tournament-name-group');
    if (type === 'invitation' || type === 'tournament') {
        group.classList.remove('hidden');
    } else {
        group.classList.add('hidden');
        document.getElementById('tournament-name').value = '';
    }
}

function addScorerRow(name = '', points = 0) {
    if (currentScorerCount >= MAX_SCORERS) {
        alert('得点者の入力枠は最大10枠までです。');
        return;
    }
    currentScorerCount++;

    const row = document.createElement('div');
    row.className = 'scorer-row';
    row.innerHTML = `
        <input type="text" class="scorer-name" placeholder="選手名 (${currentScorerCount})" value="${name}">
        <input type="number" class="scorer-points" value="${points}" min="0" placeholder="得点">
    `;
    scorerContainer.appendChild(row);
    row.querySelector('.scorer-points').addEventListener('input', calculateTotalScore);
}

function calculateTotalScore() {
    let total = 0;
    document.querySelectorAll('.scorer-points').forEach(input => {
        const val = parseInt(input.value, 10);
        if (!isNaN(val)) total += val;
    });
    document.getElementById('score-home').value = total;
}

function initScorers() {
    scorerContainer.innerHTML = '';
    currentScorerCount = 0;
    for (let i = 0; i < 3; i++) {
        addScorerRow();
    }
}

const btnAddScorer = document.getElementById('btn-add-scorer');
if (btnAddScorer) {
    btnAddScorer.addEventListener('click', (e) => {
        e.preventDefault();
        addScorerRow();
    });
}

function clearForm() {
    document.getElementById('match-date').value = '';
    document.getElementById('opponent-name').value = '';
    document.getElementById('score-away').value = '0';
    document.getElementById('tournament-name').value = '';
    document.getElementById('gk-name').value = '';
    
    const defaultRadio = document.querySelector('input[name="match-type"][value="tm"]');
    if(defaultRadio) defaultRadio.checked = true;
    toggleTournamentInput('tm');
    
    editingMatchId = null;
    formTitle.textContent = '📝 新しい試合の登録';
    btnSubmitMatch.textContent = '＋ 試合結果を追加する';
    btnCancelEdit.classList.add('hidden');
    
    initScorers();
    calculateTotalScore();
}

// Firebaseからデータを取得して一覧表示する関数
async function loadMatchesFromFirestore() {
    try {
        const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        matches = [];
        querySnapshot.forEach((doc) => {
            matches.push({ id: doc.id, ...doc.data() });
        });
        renderMatchList();
    } catch (e) {
        console.error("Error loading documents: ", e);
    }
}

if (btnSubmitMatch) {
    btnSubmitMatch.addEventListener('click', async () => {
        const date = document.getElementById('match-date').value || '未設定';
        const opponent = document.getElementById('opponent-name').value || '対戦相手未入力';
        const homeScore = parseInt(document.getElementById('score-home').value, 10) || 0;
        const awayScore = parseInt(document.getElementById('score-away').value, 10) || 0;
        const gkName = document.getElementById('gk-name').value || '未設定';
        
        const checkedRadio = document.querySelector('input[name="match-type"]:checked');
        const typeVal = checkedRadio ? checkedRadio.value : 'tm';
        const tourName = document.getElementById('tournament-name').value;

        let scorersData = [];
        document.querySelectorAll('.scorer-row').forEach(row => {
            const name = row.querySelector('.scorer-name').value.trim();
            const points = parseInt(row.querySelector('.scorer-points').value, 10) || 0;
            if (name !== '' || points > 0) {
                scorersData.push({ name: name || '不明', points: points });
            }
        });

        const matchData = {
            date, opponent, homeScore, awayScore, typeVal, tourName, gkName, scorersData,
            createdAt: Date.now()
        };

        if (editingMatchId !== null) {
            if (!confirm('この内容で試合結果を訂正（更新）してもよろしいですか？')) return;
            try {
                const matchDocRef = doc(db, "matches", editingMatchId);
                await updateDoc(matchDocRef, matchData);
                alert('試合結果を訂正しました。');
            } catch (e) {
                alert('通信エラーが発生しました。設定（ルール）を確認してください。');
                return;
            }
        } else {
            try {
                await addDoc(collection(db, "matches"), matchData);
                alert('試合結果を登録しました。');
            } catch (e) {
                alert('通信エラーが発生しました。設定（ルール）を確認してください。');
                return;
            }
        }

        await loadMatchesFromFirestore();
        clearForm();
    });
}

function renderMatchList() {
    const matchListContainer = document.getElementById('match-list');
    matchListContainer.innerHTML = '';

    if (matches.length === 0) {
        matchListContainer.innerHTML = '<p style="color:#9ca3af; text-align:center;" id="empty-message">登録された試合はありません。</p>';
        return;
    }

    matches.forEach(match => {
        let typeText = 'TM';
        if (match.typeVal === 'invitation') typeText = '招待試合';
        if (match.typeVal === 'tournament') typeText = '大会';
        
        const displayTitle = match.tourName ? `【${typeText}・${match.tourName}】` : `【${typeText}】`;

        let scorersText = 'なし';
        if (match.scorersData && match.scorersData.length > 0) {
            scorersText = match.scorersData.map(s => `${s.name} (${s.points})`).join(', ');
        }

        const listItem = document.createElement('div');
        listItem.className = 'match-list-item';
        listItem.innerHTML = `
            <div><strong>${match.date} ${displayTitle}</strong></div>
            <div style="font-size: 16px; margin: 5px 0; font-weight: bold;">
                高尾SC ${match.homeScore} - ${match.awayScore} ${match.opponent}
            </div>
            <div class="match-details">
                ⚽ 得点者: ${scorersText}<br>
                🧤 GK: ${match.gkName}
            </div>
            <div class="match-item-actions">
                <button class="btn btn-sm btn-edit" data-id="${match.id}">訂正</button>
                <button class="btn btn-sm btn-delete" data-id="${match.id}">削除</button>
            </div>
        `;

        listItem.querySelector('.btn-edit').addEventListener('click', () => {
            loadMatchToForm(match.id);
        });

        listItem.querySelector('.btn-delete').addEventListener('click', async () => {
            if (confirm(`本当にこの試合（VS ${match.opponent}）の結果を削除してもよろしいですか？`)) {
                try {
                    await deleteDoc(doc(db, "matches", match.id));
                    alert('試合結果を削除しました。');
                    await loadMatchesFromFirestore();
                    if (editingMatchId === match.id) clearForm();
                } catch (e) {
                    alert('削除に失敗しました。');
                }
            }
        });

        matchListContainer.appendChild(listItem);
    });
}

function loadMatchToForm(id) {
    const match = matches.find(m => m.id === id);
    if (!match) return;

    editingMatchId = id;
    formTitle.textContent = '✏️ 試合結果の訂正（編集）';
    btnSubmitMatch.textContent = '💾 訂正内容を保存する';
    btnCancelEdit.classList.remove('hidden');

    document.getElementById('match-date').value = match.date === '未設定' ? '' : match.date;
    document.getElementById('opponent-name').value = match.opponent === '対戦相手未入力' ? '' : match.opponent;
    document.getElementById('score-away').value = match.awayScore;
    document.getElementById('gk-name').value = match.gkName === '未設定' ? '' : match.gkName;
    document.getElementById('tournament-name').value = match.tourName || '';

    const radioToCheck = document.querySelector(`input[name="match-type"][value="${match.typeVal}"]`);
    if (radioToCheck) radioToCheck.checked = true;
    toggleTournamentInput(match.typeVal);

    scorerContainer.innerHTML = '';
    currentScorerCount = 0;
    
    if (match.scorersData && match.scorersData.length > 0) {
        match.scorersData.forEach(s => {
            addScorerRow(s.name, s.points);
        });
    }
    
    while (currentScorerCount < 3) {
        addScorerRow();
    }

    calculateTotalScore();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
        clearForm();
    });
}

// 起動時にデータを読み込む
initScorers();
loadMatchesFromFirestore();
