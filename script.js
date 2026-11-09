const firebaseConfig = {
  apiKey: "AIzaSyDolQhgpQKKq8oµgPyXNyou2",
  authDomain: "://firebaseapp.com",
  projectId: "takao-sc-match",
  storageBucket: "://appspot.com",
  messagingSenderId: "1032352956906",
  appId: "1:1032352956906:web:310dfa13812a9fbbdd3293"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const MAX_SCORERS = 10;
    let currentScorerCount = 0;
    let editingMatchId = null; 
    const scorerContainer = document.getElementById('scorer-container');
    const formTitle = document.getElementById('form-title');
    const btnSubmitMatch = document.getElementById('btn-submit-match');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    document.querySelectorAll('input[name="match-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const group = document.getElementById('tournament-name-group');
            if (e.target.value === 'invitation' || e.target.value === 'tournament') {
                group.classList.remove('hidden');
            } else {
                group.classList.add('hidden');
                document.getElementById('tournament-name').value = '';
            }
        });
    });

    function addScorerRow(name = '', points = null) {
        if (currentScorerCount >= MAX_SCORERS) return;
        currentScorerCount++;
        const row = document.createElement('div');
        row.className = 'scorer-row';
        row.innerHTML = `
            <input type="text" class="scorer-name" placeholder="選手名 (${currentScorerCount})" value="${name}">
            <input type="number" class="scorer-points" value="${(points === null || points === 0) ? '' : points}" min="0" placeholder="0">
        `;
        scorerContainer.appendChild(row);
        row.querySelector('.scorer-points').addEventListener('input', () => {
            let total = 0; let hasInput = false;
            document.querySelectorAll('.scorer-points').forEach(input => {
                const val = parseInt(input.value, 10);
                if (!isNaN(val)) { total += val; hasInput = true; }
            });
            document.getElementById('score-home').value = hasInput ? total : '';
        });
    }

    function initScorers() {
        scorerContainer.innerHTML = ''; currentScorerCount = 0;
        for (let i = 0; i < 3; i++) addScorerRow();
    }

    document.getElementById('btn-add-scorer').addEventListener('click', (e) => {
        e.preventDefault(); addScorerRow();
    });

    function clearForm() {
        document.getElementById('match-date').value = ''; document.getElementById('opponent-name').value = '';
        document.getElementById('score-home').value = ''; document.getElementById('score-away').value = '';
        document.getElementById('tournament-name').value = ''; document.getElementById('gk-name').value = '';
        document.querySelector('input[name="match-type"][value="tm"]').checked = true;
        document.getElementById('tournament-name-group').classList.add('hidden');
        editingMatchId = null; formTitle.textContent = '📝 新しい試合の登録';
        btnSubmitMatch.textContent = '＋ 試合結果を追加する'; btnCancelEdit.classList.add('hidden');
        initScorers();
    }

    btnSubmitMatch.addEventListener('click', () => {
        const date = document.getElementById('match-date').value || '未設定';
        const opponent = document.getElementById('opponent-name').value || '対戦相手未入力';
        const homeScore = parseInt(document.getElementById('score-home').value, 10) || 0;
        const awayScore = parseInt(document.getElementById('score-away').value, 10) || 0;
        const gkName = document.getElementById('gk-name').value || '未設定';
        const typeVal = document.querySelector('input[name="match-type"]:checked').value;
        const tourName = document.getElementById('tournament-name').value;

        let scorersData = [];
        document.querySelectorAll('.scorer-row').forEach(row => {
            const name = row.querySelector('.scorer-name').value.trim();
            const points = parseInt(row.querySelector('.scorer-points').value, 10) || 0;
            if (name !== '' || points > 0) scorersData.push({ name, points });
        });

        const matchData = { date, opponent, homeScore, awayScore, typeVal, tourName, gkName, scorersData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };

        if (editingMatchId !== null) {
            if (!confirm('この内容で試合結果を訂正（更新）してもよろしいですか？')) return;
            db.collection('matches').doc(editingMatchId).update(matchData).then(() => { alert('試合結果を訂正しました。'); clearForm(); });
        } else {
            matchData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            db.collection('matches').add(matchData).then(() => { alert('試合結果を登録しました。'); clearForm(); });
        }
    });

    db.collection('matches').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        const container = document.getElementById('match-list'); container.innerHTML = '';
        if (snapshot.empty) { container.innerHTML = '<p style="color:#9ca3af; text-align:center;">登録された試合はありません。</p>'; return; }
        snapshot.forEach((doc) => {
            const match = doc.data(); const id = doc.id;
            let typeText = match.typeVal === 'invitation' ? '招待試合' : (match.typeVal === 'tournament' ? '大会' : 'TM');
            const listItem = document.createElement('div'); listItem.className = 'match-list-item';
            listItem.innerHTML = `
                <div class="match-item-title">${match.date} ${match.tourName ? `【${typeText}・${match.tourName}】` : `【${typeText}】`}</div>
                <div class="match-item-score">高尾SC ${match.homeScore} - ${match.awayScore} ${match.opponent}</div>
                <div class="match-details">⚽ 得点者: ${match.scorersData.length ? match.scorersData.map(s => `${s.name} (${s.points})`).join(', ') : 'なし'}<br>🧤 GK: ${match.gkName}</div>
                <div class="match-item-actions"><button class="btn btn-sm btn-edit" id="edit-${id}">訂正</button><button class="btn btn-sm btn-delete" id="del-${id}">削除</button></div>`;
            container.appendChild(listItem);
            document.getElementById(`edit-${id}`).addEventListener('click', () => {
                editingMatchId = id; formTitle.textContent = '✏️ 試合結果の訂正'; btnSubmitMatch.textContent = '💾 訂正内容を保存する'; btnCancelEdit.classList.remove('hidden');
                document.getElementById('match-date').value = match.date === '未設定' ? '' : match.date;
                document.getElementById('opponent-name').value = match.opponent === '対戦相手未入力' ? '' : match.opponent;
                document.getElementById('score-home').value = match.homeScore; document.getElementById('score-away').value = match.awayScore;
                document.getElementById('gk-name').value = match.gkName === '未設定' ? '' : match.gkName; document.getElementById('tournament-name').value = match.tourName || '';
                document.querySelector(`input[name="match-type"][value="${match.typeVal}"]`).checked = true;
                document.getElementById('tournament-name-group').classList.toggle('hidden', !(match.typeVal === 'invitation' || match.typeVal === 'tournament'));
                scorerContainer.innerHTML = ''; currentScorerCount = 0;
                match.scorersData.forEach(s => addScorerRow(s.name, s.points));
                while (currentScorerCount < 3) addScorerRow();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            document.getElementById(`del-${id}`).addEventListener('click', () => {
                if (confirm(`本当に削除してもよろしいですか？`)) { db.collection('matches').doc(id).delete().then(() => { alert('削除しました。'); if (editingMatchId === id) clearForm(); }); }
            });
        });
    });

    btnCancelEdit.addEventListener('click', clearForm);
    initScorers();
});
