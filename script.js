document.addEventListener('DOMContentLoaded', () => {
    const MAX_SCORERS = 10;
    let currentScorerCount = 0;
    let matches = []; // 登録された試合データを保持する配列
    let editingMatchId = null; // 現在編集中の試合のID（nullなら新規登録モード）

    const scorerContainer = document.getElementById('scorer-container');
    const formTitle = document.getElementById('form-title');
    const btnSubmitMatch = document.getElementById('btn-submit-match');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    // 試合の種類ラジオボタンの切り替えイベント
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

    // 得点者入力枠を1枠追加する関数
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

    // 個人得点から高尾SCの総得点を自動計算
    function calculateTotalScore() {
        let total = 0;
        document.querySelectorAll('.scorer-points').forEach(input => {
            const val = parseInt(input.value, 10);
            if (!isNaN(val)) {
                total += val;
            }
        });
        document.getElementById('score-home').value = total;
    }

    // 初期化処理：初期表示で3枠追加する
    function initScorers() {
        scorerContainer.innerHTML = '';
        currentScorerCount = 0;
        for (let i = 0; i < 3; i++) {
            addScorerRow();
        }
    }

    // 「枠を追加する」ボタンのイベント
    const btnAddScorer = document.getElementById('btn-add-scorer');
    if (btnAddScorer) {
        btnAddScorer.addEventListener('click', (e) => {
            e.preventDefault();
            addScorerRow();
        });
    }

    // フォームの入力内容をすべてクリアして初期状態に戻す関数
    function clearForm() {
        document.getElementById('match-date').value = '';
        document.getElementById('opponent-name').value = '';
        document.getElementById('score-away').value = '0';
        document.getElementById('tournament-name').value = '';
        document.getElementById('gk-name').value = '';
        
        const defaultRadio = document.querySelector('input[name="match-type"][value="tm"]');
        if(defaultRadio) defaultRadio.checked = true;
        
        document.getElementById('tournament-name-group').classList.add('hidden');
        
        // 編集モードの解除
        editingMatchId = null;
        formTitle.textContent = '📝 新しい試合の登録';
        btnSubmitMatch.textContent = '＋ 試合結果を追加する';
        btnCancelEdit.classList.add('hidden');
        
        initScorers();
        calculateTotalScore();
    }

    // 「試合結果を追加する/訂正を保存する」ボタンのイベント
    if (btnSubmitMatch) {
        btnSubmitMatch.addEventListener('click', () => {
            const date = document.getElementById('match-date').value || '未設定';
            const opponent = document.getElementById('opponent-name').value || '対戦相手未入力';
            const homeScore = parseInt(document.getElementById('score-home').value, 10) || 0;
            const awayScore = parseInt(document.getElementById('score-away').value, 10) || 0;
            const gkName = document.getElementById('gk-name').value || '未設定';
            
            const checkedRadio = document.querySelector('input[name="match-type"]:checked');
            const typeVal = checkedRadio ? checkedRadio.value : 'tm';
            const tourName = document.getElementById('tournament-name').value;

            // 得点者情報の収集
            let scorersData = [];
            document.querySelectorAll('.scorer-row').forEach(row => {
                const name = row.querySelector('.scorer-name').value.trim();
                const points = parseInt(row.querySelector('.scorer-points').value, 10) || 0;
                if (name !== '' || points > 0) {
                    scorersData.push({ name: name || '不明', points: points });
                }
            });

            if (editingMatchId !== null) {
                // 訂正（編集）モード時の確認ポップアップ
                if (!confirm('この内容で試合結果を訂正（更新）してもよろしいですか？')) {
                    return;
                }
                // データの更新
                const matchIndex = matches.findIndex(m => m.id === editingMatchId);
                if (matchIndex !== -1) {
                    matches[matchIndex] = {
                        id: editingMatchId, date, opponent, homeScore, awayScore, typeVal, tourName, gkName, scorersData
                    };
                }
                alert('試合結果を訂正しました。');
            } else {
                // 新規登録モード
                const newMatch = {
                    id: Date.now().toString(), // 簡易的なユニークID
                    date, opponent, homeScore, awayScore, typeVal, tourName, gkName, scorersData
                };
                matches.unshift(newMatch); // 配列の先頭に追加
                alert('試合結果を登録しました。');
            }

            renderMatchList();
            clearForm(); // 登録・更新後はフォームを自動クリア
        });
    }

    // 全試合結果一覧を画面に描画する関数
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

            // 得点者テキストの生成
            let scorersText = 'なし';
            if (match.scorersData.length > 0) {
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

            // 訂正（編集）ボタンの処理
            listItem.querySelector('.btn-edit').addEventListener('click', () => {
                loadMatchToForm(match.id);
            });

            // 削除ボタンの処理（ポップアップ付き）
            listItem.querySelector('.btn-delete').addEventListener('click', () => {
                if (confirm(`本当にこの試合（VS ${match.opponent}）の結果を削除してもよろしいですか？`)) {
                    matches = matches.filter(m => m.id !== match.id);
                    alert('試合結果を削除しました。');
                    renderMatchList();
                    if (editingMatchId === match.id) {
                        clearForm(); // 編集中のデータを消されたらフォームも戻す
                    }
                }
            });

            matchListContainer.appendChild(listItem);
        });
    }

    // 選択された試合データをフォームに読み込む関数
    function loadMatchToForm(id) {
        const match = matches.find(m => m.id === id);
        if (!match) return;

        editingMatchId = id;
        formTitle.textContent = '✏️ 試合結果の訂正（編集）';
        btnSubmitMatch.textContent = '💾 訂正内容を保存する';
        btnCancelEdit.classList.remove('hidden');

        // 各フィールドへの値セット
        document.getElementById('match-date').value = match.date === '未設定' ? '' : match.date;
        document.getElementById('opponent-name').value = match.opponent === '対戦相手未入力' ? '' : match.opponent;
        document.getElementById('score-away').value = match.awayScore;
        document.getElementById('gk-name').value = match.gkName === '未設定' ? '' : match.gkName;
        document.getElementById('tournament-name').value = match.tourName || '';

        const radioToCheck = document.querySelector(`input[name="match-type"][value="${match.typeVal}"]`);
        if (radioToCheck) radioToCheck.checked = true;
        toggleTournamentInput(match.typeVal);

        // 得点者枠の復元
        scorerContainer.innerHTML = '';
        currentScorerCount = 0;
        
        if (match.scorersData.length > 0) {
            match.scorersData.forEach(s => {
                addScorerRow(s.name, s.points);
            });
        }
        
        // 最低3枠は担保する
        while (currentScorerCount < 3) {
            addScorerRow();
        }

        calculateTotalScore();
        window.scrollTo({ top: 0, behavior: 'smooth' }); // 画面上部のフォームへスムーズにスクロール
    }

    // 「編集を中止してクリア」ボタンのイベント
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            clearForm();
});
}
// 起動時に初期表示の3枠をセット
initScorers();
});
