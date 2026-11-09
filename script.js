document.addEventListener('DOMContentLoaded', () => {
    const MAX_SCORERS = 10;
    let currentScorerCount = 0;
    const scorerContainer = document.getElementById('scorer-container');

    // 試合の種類ラジオボタンの切り替え
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

    // 得点者入力枠を追加する関数
    function addScorerRow() {
        if (currentScorerCount >= MAX_SCORERS) {
            alert('得点者の入力枠は最大10枠までです。');
            return;
        }
        currentScorerCount++;

        const row = document.createElement('div');
        row.className = 'scorer-row';
        row.innerHTML = `
            <input type="text" class="scorer-name" placeholder="選手名 (${currentScorerCount})">
            <input type="number" class="scorer-points" value="0" min="0" placeholder="得点">
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

    // 「試合結果を追加する」ボタンのイベント
    const btnAddMatch = document.getElementById('btn-add-match');
    if (btnAddMatch) {
        btnAddMatch.addEventListener('click', () => {
            const date = document.getElementById('match-date').value || '未設定';
            const opponent = document.getElementById('opponent-name').value || '未校名';
            const homeScore = document.getElementById('score-home').value;
            const awayScore = document.getElementById('score-away').value;
            
            let typeText = 'TM';
            const checkedRadio = document.querySelector('input[name="match-type"]:checked');
            const typeVal = checkedRadio ? checkedRadio.value : 'tm';
            
            if(typeVal === 'invitation') typeText = '招待試合';
            if(typeVal === 'tournament') typeText = '大会';
            
            const tourName = document.getElementById('tournament-name').value;
            const displayTitle = tourName ? `【${typeText}・${tourName}】` : `【${typeText}】`;

            const emptyMsg = document.getElementById('empty-message');
            if(emptyMsg) emptyMsg.remove();

            const listItem = document.createElement('div');
            listItem.className = 'match-list-item';
            listItem.innerHTML = `<strong>${date} ${displayTitle}</strong><br>高尾SC ${homeScore} - ${awayScore} ${opponent}`;
            document.getElementById('match-list').prepend(listItem);

            alert('試合結果を記録しました');
        });
    }

    // キャンセルボタンの動作（クリア）
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            if(confirm('入力をクリアして初期状態に戻しますか？')) {
                document.getElementById('match-date').value = '';
                document.getElementById('opponent-name').value = '';
                document.getElementById('score-away').value = '0';
                document.getElementById('tournament-name').value = '';
                document.getElementById('gk-name').value = '';
                const defaultRadio = document.querySelector('input[name="match-type"][value="tm"]');
                if(defaultRadio) defaultRadio.checked = true;
                document.getElementById('tournament-name-group').classList.add('hidden');
                initScorers();
                calculateTotalScore();
            }
        });
    }

    // 起動時に初期表示の3枠をセット
    initScorers();
});
