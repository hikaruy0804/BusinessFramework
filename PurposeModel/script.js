document.addEventListener('DOMContentLoaded', () => {
    const svg = d3.select("#model-svg");
    const svgContainer = document.querySelector('.svg-container');
    const width = 900; // 名前が外側に配置されるため幅を拡大
    const height = 700; // 名前が外側に配置されるため高さを拡大
    const radius = Math.min(width, height) / 2 * 0.8;

    // SVGのサイズを設定
    svg.attr("viewBox", `0 0 ${width} ${height}`)
       .attr("preserveAspectRatio", "xMidYMid meet")
       .style("width", "100%")
       .style("height", "100%");

    // LocalStorageのキー（クリーン版専用）
    const STORAGE_KEY = 'purpose-model-data-clean';

    // 初期データ（LocalStorageにデータがない場合のみ使用）- クリーンな状態
    const defaultTimelineData = {
        current: {
            purpose: {
                title: 'タイトル',
                description: '共通の目的'
            },
            stakeholders: []
        },
        past: {
            purpose: {
                title: '過去の目的',
                description: '過去に目指していた価値'
            },
            stakeholders: []
        },
        'near-future': {
            purpose: {
                title: '数年先の目的',
                description: '数年先に実現したい価値'
            },
            stakeholders: []
        },
        future: {
            purpose: {
                title: '将来の目的',
                description: '将来的に実現したい価値'
            },
            stakeholders: []
        }
    };

    // LocalStorageからデータを読み込む関数
    function loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                return {
                    timelineData: data.timelineData || defaultTimelineData,
                    currentTimeline: data.currentTimeline || 'current'
                };
            }
        } catch (error) {
            console.warn('LocalStorageからのデータ読み込みに失敗しました:', error);
        }
        return {
            timelineData: defaultTimelineData,
            currentTimeline: 'current'
        };
    }

    // LocalStorageにデータを保存する関数
    function saveToStorage() {
        try {
            // 現在のデータを保存前に更新
            timelineData[currentTimeline].purpose = { ...purpose };
            timelineData[currentTimeline].stakeholders = [...stakeholders];
            
            const dataToSave = {
                currentTimeline,
                timelineData
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (error) {
            console.warn('LocalStorageへのデータ保存に失敗しました:', error);
        }
    }

    // データを初期化（LocalStorageから読み込み、なければデフォルト値を使用）
    const initialData = loadFromStorage();
    let timelineData = initialData.timelineData;

    // 現在選択されている時間軸（LocalStorageから復元）
    let currentTimeline = initialData.currentTimeline;

    // 現在のデータ（選択された時間軸のデータを参照）
    let purpose = timelineData[currentTimeline].purpose;
    let stakeholders = timelineData[currentTimeline].stakeholders;

    const categoryColors = {
        company: '#69DB7C',    // 企業 → グリーン
        government: '#FFD43B', // 行政 → イエロー  
        citizen: '#FF8A65',    // 住民 → コーラルオレンジ
        expert: '#5C7CFA'      // 専門家 → ブルー
    };

    // --- DOM Elements ---
    const timelineStatusSelect = document.getElementById('timeline-status');
    const stakeholderNameInput = document.getElementById('stakeholder-name');
    const stakeholderRoleInput = document.getElementById('stakeholder-role');
    const stakeholderGoalInput = document.getElementById('stakeholder-goal');
    const stakeholderCategoryInput = document.getElementById('stakeholder-category');
    const stakeholderLayerInput = document.getElementById('stakeholder-layer');
    const addStakeholderBtn = document.getElementById('add-stakeholder-btn');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const newBtn = document.getElementById('new-btn');
    const loadJsonBtn = document.getElementById('load-json-btn');
    const jsonFileInput = document.getElementById('json-file-input');
    const saveJsonBtn = document.getElementById('save-json-btn');
    const exportPngBtn = document.getElementById('export-png-btn');
    
    // モーダル要素
    const editModal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalLabel = document.getElementById('modal-label');
    const modalInput = document.getElementById('modal-input');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSave = document.getElementById('modal-save');
    const modalDelete = document.getElementById('modal-delete');
    
    // 確認モーダル要素
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmClose = document.getElementById('confirm-close');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmOk = document.getElementById('confirm-ok');
    
    // 通知モーダル要素
    const alertModal = document.getElementById('alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertClose = document.getElementById('alert-close');
    const alertOk = document.getElementById('alert-ok');
    
    let currentEditData = null;
    let confirmCallback = null;

    // 入力フィールドの検証
    function validateStakeholderInputs() {
        const name = stakeholderNameInput.value.trim();
        const role = stakeholderRoleInput.value.trim();
        const goal = stakeholderGoalInput.value.trim();
        const category = stakeholderCategoryInput.value;
        const layer = stakeholderLayerInput.value;
        
        // 文字数制限チェック
        const nameValid = name && name.length <= 10;
        const roleValid = role && role.length <= 10;
        const goalValid = goal && goal.length <= 20;
        
        const isValid = nameValid && roleValid && goalValid && category && layer;
        addStakeholderBtn.disabled = !isValid;
        
        // ボタンの見た目も変更
        if (isValid) {
            addStakeholderBtn.style.opacity = '1';
            addStakeholderBtn.style.cursor = 'pointer';
        } else {
            addStakeholderBtn.style.opacity = '0.5';
            addStakeholderBtn.style.cursor = 'not-allowed';
        }
        
        return isValid;
    }

    // 入力フィールドにイベントリスナーを追加
    [stakeholderNameInput, stakeholderRoleInput, stakeholderGoalInput, stakeholderCategoryInput, stakeholderLayerInput].forEach(input => {
        input.addEventListener('input', validateStakeholderInputs);
        input.addEventListener('change', validateStakeholderInputs);
    });
    timelineStatusSelect.addEventListener('change', (e) => {
        // 現在のデータを保存
        timelineData[currentTimeline].purpose = { ...purpose };
        timelineData[currentTimeline].stakeholders = [...stakeholders];
        
        // 新しい時間軸に切り替え
        currentTimeline = e.target.value;
        purpose = timelineData[currentTimeline].purpose;
        stakeholders = timelineData[currentTimeline].stakeholders;
        
        // LocalStorageに保存
        saveToStorage();
        
        // UIを更新
        updateUI();
        drawModel(true); // アニメーション付きで描画
    });

    addStakeholderBtn.addEventListener('click', () => {
        // 入力検証
        if (!validateStakeholderInputs()) {
            return; // 無効な入力の場合は処理を中断
        }
        
        const newStakeholder = {
            id: uuidv4(),
            name: stakeholderNameInput.value.trim(),
            role: stakeholderRoleInput.value.trim(),
            goal: stakeholderGoalInput.value.trim(),
            category: stakeholderCategoryInput.value,
            layer: stakeholderLayerInput.value
        };
        stakeholders.push(newStakeholder);
        timelineData[currentTimeline].stakeholders.push(newStakeholder);
        saveToStorage(); // 自動保存
        drawModel(true); // 要素追加時はアニメーション付き
        clearInputFields();
    });

    hamburgerBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
    
    // モーダルのイベントリスナー
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalSave.addEventListener('click', saveEdit);
    modalDelete.addEventListener('click', deleteStakeholder);
    
    // 確認モーダルのイベントリスナー
    confirmClose.addEventListener('click', closeConfirmModal);
    confirmCancel.addEventListener('click', closeConfirmModal);
    confirmOk.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        closeConfirmModal();
    });
    
    // 通知モーダルのイベントリスナー
    alertClose.addEventListener('click', closeAlertModal);
    alertOk.addEventListener('click', closeAlertModal);
    
    // モーダル背景クリックで閉じる
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal();
        }
    });
    
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
    
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            closeAlertModal();
        }
    });
    
    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (editModal.style.display === 'block') {
                closeModal();
            } else if (confirmModal.style.display === 'block') {
                closeConfirmModal();
            } else if (alertModal.style.display === 'block') {
                closeAlertModal();
            }
        }
    });

    newBtn.addEventListener('click', () => {
        showConfirm('新規作成', '現在の内容を破棄して新規作成しますか？', () => {
            // 全ての時間軸データをリセット
            timelineData = {
                current: {
                    purpose: { title: 'タイトル', description: '共通の目的' },
                    stakeholders: []
                },
                past: {
                    purpose: { title: '過去の目的', description: '過去に目指していた価値' },
                    stakeholders: []
                },
                'near-future': {
                    purpose: { title: '数年先の目的', description: '数年先に実現したい価値' },
                    stakeholders: []
                },
                future: {
                    purpose: { title: '将来の目的', description: '将来的に実現したい価値' },
                    stakeholders: []
                }
            };
            
            // 現在の時間軸を「現在」にリセット
            currentTimeline = 'current';
            timelineStatusSelect.value = 'current';
            purpose = timelineData[currentTimeline].purpose;
            stakeholders = timelineData[currentTimeline].stakeholders;
            
            // LocalStorageもクリア
            saveToStorage();
            
            updateUI();
            drawModel(true); // アニメーション付きで描画
        });
    });

    loadJsonBtn.addEventListener('click', () => jsonFileInput.click());

    jsonFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // 新形式（時間軸対応）の場合
                    if (data.timelineData) {
                        timelineData = data.timelineData;
                        currentTimeline = data.currentTimeline || 'current';
                        timelineStatusSelect.value = currentTimeline;
                    } 
                    // 旧形式（時間軸なし）の場合は現在に設定
                    else if (data.purpose && data.stakeholders) {
                        timelineData.current.purpose = data.purpose;
                        timelineData.current.stakeholders = data.stakeholders;
                        currentTimeline = 'current';
                        timelineStatusSelect.value = 'current';
                    }
                    
                    purpose = timelineData[currentTimeline].purpose;
                    stakeholders = timelineData[currentTimeline].stakeholders;
                    
                    // LocalStorageに保存
                    saveToStorage();
                    
                    updateUI();
                    drawModel(true); // アニメーション付きで描画
                } catch (error) {
                    showAlert('エラー', 'JSONファイルの読み込みに失敗しました。');
                }
            };
            reader.readAsText(file);
        }
    });

    saveJsonBtn.addEventListener('click', () => {
        // 現在のデータを保存してから出力
        timelineData[currentTimeline].purpose = { ...purpose };
        timelineData[currentTimeline].stakeholders = [...stakeholders];
        
        const data = { 
            currentTimeline,
            timelineData 
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        saveAs(blob, 'purpose-model.json');
    });

    exportPngBtn.addEventListener('click', () => {
        const svgElement = document.getElementById('model-svg');
        
        // 現在のデータを保存してからPNG出力
        saveToStorage();
        
        // 固定サイズで十分な余白を確保（下側のテキストも含む）
        const exportWidth = 1000;
        const exportHeight = 800;
        
        // 一時的にSVGのサイズを設定
        const originalViewBox = svgElement.getAttribute('viewBox');
        const originalWidth = svgElement.getAttribute('width');
        const originalHeight = svgElement.getAttribute('height');
        
        svgElement.setAttribute('width', exportWidth);
        svgElement.setAttribute('height', exportHeight);
        svgElement.setAttribute('viewBox', `0 0 ${exportWidth} ${exportHeight}`);
        
        // エクスポート用に再描画
        drawModel(false, true); // exportMode = true
        
        // 少し待ってからSVGを取得（描画完了を待つ）
        setTimeout(() => {
            // SVGを文字列として取得
            const svgString = new XMLSerializer().serializeToString(svgElement);
            
            // Canvasを作成
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = exportWidth;
            canvas.height = exportHeight;
            
            // 背景を白に設定
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // SVGをImageに変換
            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                // 画像をcanvasに描画
                ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
                
                // PNGとして保存
                canvas.toBlob((blob) => {
                    saveAs(blob, 'purpose-model.png');
                }, 'image/png');
                
                // リソースをクリーンアップ
                URL.revokeObjectURL(url);
                
                // SVGの属性を元に戻す
                if (originalViewBox) {
                    svgElement.setAttribute('viewBox', originalViewBox);
                } else {
                    svgElement.removeAttribute('viewBox');
                }
                if (originalWidth) {
                    svgElement.setAttribute('width', originalWidth);
                } else {
                    svgElement.removeAttribute('width');
                }
                if (originalHeight) {
                    svgElement.setAttribute('height', originalHeight);
                } else {
                    svgElement.removeAttribute('height');
                }
                
                // 通常表示用に再描画（データを保持）
                drawModel(true); // アニメーション付きで再描画
            };
            
            img.onerror = (error) => {
                console.error('PNG出力エラー:', error);
                showAlert('エラー', 'PNG出力に失敗しました。');
                URL.revokeObjectURL(url);
                
                // エラー時もSVGの属性を元に戻す
                if (originalViewBox) {
                    svgElement.setAttribute('viewBox', originalViewBox);
                } else {
                    svgElement.removeAttribute('viewBox');
                }
                if (originalWidth) {
                    svgElement.setAttribute('width', originalWidth);
                } else {
                    svgElement.removeAttribute('width');
                }
                if (originalHeight) {
                    svgElement.setAttribute('height', originalHeight);
                } else {
                    svgElement.removeAttribute('height');
                }
                
                // 通常表示用に再描画（データを保持）
                drawModel(true); // アニメーション付きで再描画
            };
            
            img.src = url;
        }, 100); // 100ms待機
    });

    // --- Drawing Functions ---
    function drawModel(animate = true, exportMode = false) {
        const duration = animate ? 600 : 0;
        
        // エクスポートモード時は固定サイズを使用
        const drawWidth = exportMode ? 1000 : width;
        const drawHeight = exportMode ? 800 : height;
        
        // 既存要素をフェードアウト
        if (animate) {
            svg.selectAll("*")
                .transition()
                .duration(300)
                .style("opacity", 0)
                .remove();
        } else {
            svg.selectAll("*").remove();
        }
        
        // 新しい要素を描画
        const delay = animate ? 300 : 0;
        setTimeout(() => {
            const g = svg.append("g").attr("transform", `translate(${drawWidth / 2},${drawHeight / 2})`);

            const supportingStakeholders = stakeholders.filter(s => s.layer === 'supporting');
            const leadingStakeholders = stakeholders.filter(s => s.layer === 'leading');

            // まず全ての円弧を描画
            drawArcs(g, supportingStakeholders, 'supporting', animate);
            drawArcs(g, leadingStakeholders, 'leading', animate);

            // 次に全てのテキストを描画（円弧の上に表示される）
            drawTexts(g, supportingStakeholders, 'supporting', animate);
            drawTexts(g, leadingStakeholders, 'leading', animate);

            // Draw central purpose circle
            const purposeCircle = g.append("circle")
                .attr("r", radius * 0.3)
                .attr("class", "purpose-circle")
                .style("fill", "#F4F3EE") // ウォームホワイト
                .style("stroke", "#A8A196") // ウォームグレー
                .style("stroke-width", "2px");
                
            if (animate) {
                purposeCircle
                    .style("opacity", 0)
                    .attr("r", 0)
                    .transition()
                    .duration(duration)
                    .delay(200)
                    .style("opacity", 1)
                    .attr("r", radius * 0.3)
                    .ease(d3.easeBounceOut);
            }

            // 中央テキストの折り返し処理
            const purposeText = g.append("text")
                .attr("text-anchor", "middle")
                .attr("class", "purpose-title")
                .style("fill", "#2F3E46") // ダークグリーングレー
                .style("font-size", "20px") // 18px → 20px
                .style("font-weight", "bold")
                .style("cursor", "pointer");
                
            if (animate) {
                purposeText.style("opacity", 0);
            }

            // タイトルを10文字程度で折り返し
            const titleLines = wrapText(purpose.title, 10);
            titleLines.forEach((line, i) => {
                const titleTspan = purposeText.append("tspan")
                    .attr("x", 0)
                    .attr("dy", i === 0 ? `-${(titleLines.length - 1) * 0.8}em` : "1.4em") // 行間を少し広げる
                    .text(line);
                
                // タイトルのダブルクリック編集
                titleTspan.on("dblclick", function() {
                    editPurposeText('title', purpose.title);
                });
            });

            // 説明文も10文字程度で折り返し
            const descLines = wrapText(purpose.description, 10);
            descLines.forEach((line, i) => {
                const descTspan = purposeText.append("tspan")
                    .attr("x", 0)
                    .attr("dy", i === 0 ? "2.0em" : "1.4em") // タイトルとの間隔を広げる
                    .style("font-size", "16px") // 14px → 16px
                    .style("font-weight", "normal")
                    .text(line);
                
                // 説明文のダブルクリック編集
                descTspan.on("dblclick", function() {
                    editPurposeText('description', purpose.description);
                });
            });
            
            if (animate) {
                purposeText
                    .transition()
                    .duration(duration)
                    .delay(400)
                    .style("opacity", 1)
                    .ease(d3.easeBackOut);
            }

            // 上下の区切り線を追加（円に近づける）
            const innerRadius = radius * 0.35; // 円に近づける
            const outerRadius = radius * 0.95;
            
            // 上側の区切り線（0度）
            g.append("line")
                .attr("x1", innerRadius)
                .attr("y1", 0)
                .attr("x2", outerRadius)
                .attr("y2", 0)
                .style("stroke", "#2F3E46") // ダークグリーングレー
                .style("stroke-width", "6px");
                
            // 下側の区切り線（180度）
            g.append("line")
                .attr("x1", -innerRadius)
                .attr("y1", 0)
                .attr("x2", -outerRadius)
                .attr("y2", 0)
                .style("stroke", "#2F3E46") // ダークグリーングレー
                .style("stroke-width", "6px");

            // 「共創」ラベル（上側）
            if (supportingStakeholders.length > 0) {
                const supportingLabel = g.append("text")
                    .attr("x", 0)
                    .attr("y", -(outerRadius + 50)) // 名前の外側配置を考慮して位置調整
                    .attr("text-anchor", "middle")
                    .style("font-size", "20px")
                    .style("font-weight", "bold")
                    .style("fill", "#2F3E46") // ダークグリーングレー
                    .text("共創のステークホルダー");
                    
                if (animate) {
                    supportingLabel
                        .style("opacity", 0)
                        .transition()
                        .duration(duration)
                        .delay(600)
                        .style("opacity", 1);
                }
            }

            // 「主体」ラベル（下側）
            if (leadingStakeholders.length > 0) {
                const leadingLabel = g.append("text")
                    .attr("x", 0)
                    .attr("y", outerRadius + 65) // 名前の外側配置を考慮して位置調整
                    .attr("text-anchor", "middle")
                    .style("font-size", "20px")
                    .style("font-weight", "bold")
                    .style("fill", "#2F3E46") // ダークグリーングレー
                    .text("主体のステークホルダー");
                    
                if (animate) {
                    leadingLabel
                        .style("opacity", 0)
                        .transition()
                        .duration(duration)
                        .delay(600)
                        .style("opacity", 1);
                }
            }
        }, delay);
    }

    // 円弧のみを描画する関数
    function drawArcs(container, layerStakeholders, layerName, animate = true) {
        if (layerStakeholders.length === 0) return;

        const angleScale = d3.scaleBand()
            .domain(layerStakeholders.map(d => d.id))
            .range(layerName === 'supporting' ? [-90, 89] : [91, 270]) // 上段と下段の間に2度の空白
            .paddingInner(0); // 隙間を完全に削除

        const innerRadius = radius * 0.35; // 中央円より少し外側から開始
        const outerRadius = radius * 0.95;
        const layerBandwidth = outerRadius - innerRadius;
        const arcGen = (rIn, rOut) => d3.arc()
            .innerRadius(rIn)
            .outerRadius(rOut)
            .startAngle(-angleScale.bandwidth() / 2 * Math.PI / 180)
            .endAngle(angleScale.bandwidth() / 2 * Math.PI / 180);

        const groups = container.selectAll(`.arc-group-${layerName}`)
            .data(layerStakeholders, d => d.id)
            .enter().append("g")
            .attr("class", d => `arc-group arc-group-${layerName}`)
            .attr("transform", d => `rotate(${angleScale(d.id) + angleScale.bandwidth()/2})`);

        groups.each(function(d, i){
            const g = d3.select(this);
            const base = d3.color(categoryColors[d.category]);
            
            // 目的（内側2/3）と役割（外側1/3）の2層に変更 - 外側をより薄く
            const goalArc = g.append("path")
                .attr("d", arcGen(innerRadius, innerRadius + 2*layerBandwidth/3))
                .style("fill", base.darker(0.1)); // 目的 - 少し暗く
                
            const roleArc = g.append("path")
                .attr("d", arcGen(innerRadius + 2*layerBandwidth/3, innerRadius + layerBandwidth))
                .style("fill", base.brighter(0.5)); // 役割 - より薄く明るく

            // アニメーション処理
            if (animate) {
                g.style("opacity", 0)
                    .transition()
                    .duration(600)
                    .delay(i * 100)
                    .style("opacity", 1)
                    .ease(d3.easeBackOut);
            }
        });
    }

    // テキストのみを描画する関数
    function drawTexts(container, layerStakeholders, layerName, animate = true) {
        if (layerStakeholders.length === 0) return;

        const angleScale = d3.scaleBand()
            .domain(layerStakeholders.map(d => d.id))
            .range(layerName === 'supporting' ? [-90, 89] : [91, 270]) // 上段と下段の間に2度の空白
            .paddingInner(0); // 隙間を完全に削除

        const innerRadius = radius * 0.35; // 中央円より少し外側から開始
        const outerRadius = radius * 0.95;
        const layerBandwidth = outerRadius - innerRadius;

        const textGroups = container.selectAll(`.text-group-${layerName}`)
            .data(layerStakeholders, d => d.id)
            .enter().append("g")
            .attr("class", d => `text-group text-group-${layerName} stakeholder-group`)
            .attr("transform", d => `rotate(${angleScale(d.id) + angleScale.bandwidth()/2})`);

        if (animate) {
            textGroups.style("opacity", 0);
        }

        // 目的（内側2/3の中央）、役割（外側1/3の中央）、名前（円の外側）
        const labels = [
            {cls:"stakeholder-goal", r:innerRadius + layerBandwidth/3, fs:16, fw:"bold", fill:"#F4F3EE", shadow:"none", txt:d=>d.goal, wrap:8}, // 目的：16px、8文字改行
            {cls:"stakeholder-role", r:innerRadius + 5*layerBandwidth/6, fs:18, fw:"normal", fill:"#2F3E46", shadow:"none", txt:d=>d.role, wrap:false}, // 役割：18px
            {cls:"stakeholder-name", r:outerRadius + 25, fs:18, fw:"bold", fill:"#2F3E46", shadow:"none", txt:d=>d.name, wrap:false} // 名前：18px・太字
        ];

        textGroups.each(function(d, i){
            const g = d3.select(this);
            const angle = angleScale(d.id) + angleScale.bandwidth()/2;
            
            // テキストの回転角度を計算（下半分は文字だけ180度回転して読みやすくする）
            let textRotation = 0;
            if (angle > 90 && angle < 270) {
                textRotation = 180; // 下半分は文字を180度回転
            }
            
            labels.forEach(({cls,r,fs,fw,fill,shadow,txt,wrap})=>{
                if (wrap) {
                    // 改行処理が必要な場合（目的テキスト）
                    const lines = wrapText(txt(d), wrap);
                    lines.forEach((line, i) => {
                        let yPos = -r + (i * fs * 1.2) - ((lines.length - 1) * fs * 0.6);
                        // 下半分の場合、y座標を調整して位置を保持
                        if (textRotation === 180) {
                            yPos = r - (i * fs * 1.2) + ((lines.length - 1) * fs * 0.6);
                        }
                        
                        const textElement = g.append("text")
                        .attr("class", cls)
                        .attr("x", 0)
                        .attr("y", yPos)
                        .attr("text-anchor", "middle")
                        .attr("transform", `rotate(${textRotation})`)
                        .style("font-size", fs+"px")
                        .style("font-weight", fw)
                        .style("fill", fill)
                        .style("cursor", "pointer")
                        .text(line);
                        
                        // ダブルクリック編集機能を追加
                        textElement.on("dblclick", function() {
                            editText(d, cls, txt, this);
                        });
                    });
                } else {
                    // 通常のテキスト（役割・名前）
                    let yPos = -r;
                    // 下半分の場合、y座標を調整して位置を保持
                    if (textRotation === 180) {
                        yPos = r;
                    }
                    
                    const textElement = g.append("text")
                    .attr("class", cls)
                    .attr("x", 0)
                    .attr("y", yPos)
                    .attr("text-anchor", "middle")
                    .attr("transform", `rotate(${textRotation})`)
                    .style("font-size", fs+"px")
                    .style("font-weight", fw)
                    .style("fill", fill)
                    .style("cursor", "pointer")
                    .text(txt(d));
                    
                    // ダブルクリック編集機能を追加
                    textElement.on("dblclick", function() {
                        editText(d, cls, txt, this);
                    });
                }
            });

            if (animate) {
                g.transition()
                    .duration(600)
                    .delay(200 + i * 100)
                    .style("opacity", 1)
                    .ease(d3.easeBackOut);
            }
        });
    }


    // --- Utility Functions ---
    function updateUI() {
        // UIの更新処理（必要に応じて追加）
    }

    function editText(stakeholder, textClass, textGetter, textElement) {
        const currentText = textGetter(stakeholder);
        let fieldName = '';
        
        if (textClass === 'stakeholder-name') {
            fieldName = '名前';
        } else if (textClass === 'stakeholder-role') {
            fieldName = '役割';
        } else if (textClass === 'stakeholder-goal') {
            fieldName = '目的';
        }
        
        currentEditData = {
            type: 'stakeholder',
            stakeholder: stakeholder,
            textClass: textClass,
            fieldName: fieldName
        };
        
        showModal(`${fieldName}を編集`, `${fieldName}を編集してください:`, currentText, true);
    }

    function editPurposeText(type, currentText) {
        const fieldName = type === 'title' ? 'タイトル' : '共通の目的';
        
        currentEditData = {
            type: 'purpose',
            purposeType: type,
            fieldName: fieldName
        };
        
        showModal(`${fieldName}を編集`, `${fieldName}を編集してください:`, currentText, false);
    }
    
    function showModal(title, label, currentText, showDeleteButton = false) {
        modalTitle.textContent = title;
        modalLabel.textContent = label;
        modalInput.value = currentText;
        
        // 削除ボタンの表示制御
        if (showDeleteButton) {
            modalDelete.style.display = 'block';
        } else {
            modalDelete.style.display = 'none';
        }
        
        editModal.style.display = 'block';
        modalInput.focus();
        modalInput.select();
    }
    
    function closeModal() {
        editModal.style.display = 'none';
        currentEditData = null;
    }
    
    function deleteStakeholder() {
        if (!currentEditData || currentEditData.type !== 'stakeholder') {
            closeModal();
            return;
        }
        
        const stakeholder = currentEditData.stakeholder;
        const stakeholderName = stakeholder.name;
        
        closeModal(); // 編集モーダルを閉じる
        
        // 削除確認ダイアログを表示
        showConfirm(
            'ステークホルダーの削除', 
            `この要素を削除してよろしいですか。`, 
            () => {
                // stakeholdersリストから削除
                const index = stakeholders.findIndex(s => s.id === stakeholder.id);
                if (index !== -1) {
                    stakeholders.splice(index, 1);
                }
                
                // timelineDataからも削除
                const timelineIndex = timelineData[currentTimeline].stakeholders.findIndex(s => s.id === stakeholder.id);
                if (timelineIndex !== -1) {
                    timelineData[currentTimeline].stakeholders.splice(timelineIndex, 1);
                }
                
                // アニメーション付きで再描画
                drawModel(true);
                
                // LocalStorageに保存
                saveToStorage();
                
                // 削除完了の通知
                showAlert('削除完了', `「${stakeholderName}」を削除しました。`);
            }
        );
    }
    
    function closeConfirmModal() {
        confirmModal.style.display = 'none';
        confirmCallback = null;
    }
    
    function closeAlertModal() {
        alertModal.style.display = 'none';
    }
    
    function showConfirm(title, message, callback) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmCallback = callback;
        confirmModal.style.display = 'block';
    }
    
    function showAlert(title, message) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertModal.style.display = 'block';
    }
    
    function saveEdit() {
        const newText = modalInput.value.trim();
        
        if (!currentEditData || newText === '') {
            closeModal();
            return;
        }
        
        // 文字数制限チェック
        if (currentEditData.type === 'stakeholder') {
            const { textClass } = currentEditData;
            let maxLength = 20; // デフォルトは目的の20文字
            
            if (textClass === 'stakeholder-name' || textClass === 'stakeholder-role') {
                maxLength = 10; // 名前・役割は10文字
            }
            
            if (newText.length > maxLength) {
                showAlert('文字数制限エラー', `${maxLength}文字以内で入力してください。`);
                return;
            }
        } else if (currentEditData.type === 'purpose') {
            const { purposeType } = currentEditData;
            const maxLength = purposeType === 'title' ? 10 : 20; // タイトル10文字、説明20文字
            
            if (newText.length > maxLength) {
                showAlert('文字数制限エラー', `${maxLength}文字以内で入力してください。`);
                return;
            }
        }
        
        if (currentEditData.type === 'stakeholder') {
            const { stakeholder, textClass } = currentEditData;
            const currentText = textClass === 'stakeholder-name' ? stakeholder.name :
                              textClass === 'stakeholder-role' ? stakeholder.role :
                              stakeholder.goal;
            
            if (newText !== currentText) {
                // データを更新
                if (textClass === 'stakeholder-name') {
                    stakeholder.name = newText;
                } else if (textClass === 'stakeholder-role') {
                    stakeholder.role = newText;
                } else if (textClass === 'stakeholder-goal') {
                    stakeholder.goal = newText;
                }
                
                // 時間軸データも更新
                const stakeholderIndex = timelineData[currentTimeline].stakeholders.findIndex(s => s.id === stakeholder.id);
                if (stakeholderIndex !== -1) {
                    timelineData[currentTimeline].stakeholders[stakeholderIndex] = { ...stakeholder };
                }
                
                // 再描画
                drawModel(true);
                
                // LocalStorageに保存
                saveToStorage();
            }
        } else if (currentEditData.type === 'purpose') {
            const { purposeType } = currentEditData;
            const currentText = purposeType === 'title' ? purpose.title : purpose.description;
            
            if (newText !== currentText) {
                // データを更新
                if (purposeType === 'title') {
                    purpose.title = newText;
                    timelineData[currentTimeline].purpose.title = newText;
                } else {
                    purpose.description = newText;
                    timelineData[currentTimeline].purpose.description = newText;
                }
                
                // 再描画
                drawModel(true);
                
                // LocalStorageに保存
                saveToStorage();
            }
        }
        
        closeModal();
    }

    function wrapText(text, maxLength) {
        if (!text) return [''];
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < text.length; i++) {
            currentLine += text[i];
            if (currentLine.length >= maxLength || i === text.length - 1) {
                lines.push(currentLine);
                currentLine = '';
            }
        }
        
        return lines.filter(line => line.length > 0);
    }

    function clearInputFields() {
        stakeholderNameInput.value = '';
        stakeholderRoleInput.value = '';
        stakeholderGoalInput.value = '';
        stakeholderCategoryInput.value = '';
        stakeholderLayerInput.value = '';
        
        // クリア後に検証を実行してボタンを無効化
        validateStakeholderInputs();
    }

    // --- Init ---
    // 初期値をフォームに設定
    timelineStatusSelect.value = currentTimeline; // 復元された時間軸を設定
    updateUI();
    
    // 初期状態で入力検証を実行（ボタンを無効化）
    validateStakeholderInputs();
    
    drawModel(true); // 初期表示もアニメーション付き
});
