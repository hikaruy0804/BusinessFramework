document.addEventListener('DOMContentLoaded', () => {
    const svg = d3.select("#model-svg");
    const svgContainer = document.getElementById('logic-model');

    // --- DOM Elements ---
    const addItemModalBtn = document.getElementById('add-item-modal-btn');
    const addItemModal = document.getElementById('add-item-modal');
    const addModalInput = document.getElementById('add-modal-input');
    const addModalCategory = document.getElementById('add-modal-category');
    const addModalClose = document.getElementById('add-modal-close');
    const addModalCancel = document.getElementById('add-modal-cancel');
    const addModalSave = document.getElementById('add-modal-save');
    
    // Header buttons
    const newBtn = document.getElementById('new-btn');
    const loadJsonBtn = document.getElementById('load-json-btn');
    const jsonFileInput = document.getElementById('json-file-input');
    const saveJsonBtn = document.getElementById('save-json-btn');
    const exportPngBtn = document.getElementById('export-png-btn');
    
    const editModal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalLabel = document.getElementById('modal-label');
    const modalInput = document.getElementById('modal-input');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSave = document.getElementById('modal-save');
    const modalDelete = document.getElementById('modal-delete');

    // --- Data & State ---
    const STORAGE_KEY = 'logic-model-data';
    const categories = {
        inputs: { label: 'インプット', color: '#FFD166' },        // 明るいイエローオレンジ
        activities: { label: 'アクティビティ', color: '#FF6B35' },          // ビビッドオレンジ
        outputs: { label: 'アウトプット', color: '#5A3FC0' },              // パープルブルー
        short_outcomes: { label: '短期アウトカム', color: '#00A86B' },      // グリーン
        middle_outcomes: { label: '中期アウトカム', color: '#2D9CDB' },     // ブルー
        impact: { label: 'インパクト', color: '#E05297' },                 // マゼンタピンク
    };

    let modelData = { items: [], connections: [] };
    let currentEditData = null;
    let lineDrawingState = { startCardId: null };

    // --- D3 Setup ---
    const columnOrder = Object.keys(categories);
    const cardHeight = 77; // 70 * 1.1 = 77（正確に1.1倍）
    const cardVMargin = 35; // 25から35に拡大
    let cardWidth, columnWidth;

    // --- Main Drawing Function ---
    function drawModel() {
        console.log('Drawing model with items:', modelData.items.length, 'connections:', modelData.connections.length);
        
        const { width, height } = svgContainer.getBoundingClientRect();
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        // Setup definitions
        const defs = svg.append('defs');
        setupSolidColors(defs);
        setupArrowMarker(defs);

        // Calculate dimensions
        calculateDimensions();

        // Draw components in correct order (connections first, then cards on top)
        drawColumns(width, height);
        updateCardPositions();
        drawConnections(); // 矢印を先に描画（背面）
        drawCards();       // カードを後に描画（前面）
        
        console.log('Model drawing completed');
    }

    function setupSolidColors(defs) {
        // ソリッドカラーなので特別な設定は不要
        // カードの塗りつぶしは直接色を指定
    }

    function setupArrowMarker(defs) {
        const marker = defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -3 6 6')
            .attr('refX', 5)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 5)
            .attr('markerHeight', 5);
            
        marker.append('path')
            .attr('d', 'M0,-3L6,0L0,3')
            .attr('fill', '#000')
            .attr('stroke', 'none');
    }

    function calculateDimensions() {
        const { width } = svgContainer.getBoundingClientRect();
        const numColumns = columnOrder.length; // 6カラムに対応
        columnWidth = width / numColumns;
        cardWidth = columnWidth - 40;
    }

    // PNG出力用の固定サイズ計算関数
    function calculateDimensionsForExport(fixedWidth) {
        const numColumns = columnOrder.length;
        columnWidth = fixedWidth / numColumns;
        cardWidth = columnWidth - 40;
    }

    function drawColumns(width, height) {
        const columnGroup = svg.append('g').attr('class', 'columns');
        
        columnOrder.forEach((category, i) => {
            const column = columnGroup.append('g')
                .attr('class', 'column')
                .attr('transform', `translate(${i * columnWidth}, 0)`);

            column.append('rect')
                .attr('class', 'column-bg')
                .attr('width', columnWidth)
                .attr('height', height)
                .attr('fill', '#fdfdfd')
                .attr('stroke', '#f0f0f0')
                .attr('stroke-width', 1);

            column.append('text')
                .attr('class', 'column-title')
                .attr('x', columnWidth / 2)
                .attr('y', 30)
                .attr('text-anchor', 'middle')
                .attr('font-size', '18px')
                .attr('font-weight', 'bold')
                .attr('fill', '#2F3E46')
                .text(categories[category].label);
        });
    }

    function updateCardPositions() {
        const titleHeight = 50;
        columnOrder.forEach(category => {
            const categoryItems = modelData.items.filter(item => item.category === category);
            categoryItems.forEach((item, i) => {
                item.x = columnOrder.indexOf(category) * columnWidth + (columnWidth - cardWidth) / 2;
                item.y = titleHeight + i * (cardHeight + cardVMargin) + cardVMargin;
            });
        });
    }

    function drawCards() {
        const cardGroup = svg.append('g').attr('class', 'cards');
        
        modelData.items.forEach(item => {
            const card = cardGroup.append('g')
                .attr('class', 'logic-card')
                .attr('transform', `translate(${item.x}, ${item.y})`)
                .style('cursor', 'pointer')
                .on('click', function(event) { handleCardClick(event, item); })
                .on('dblclick', function(event) { handleDblClick(event, item); });

            // Card rectangle
            card.append('rect')
                .attr('class', 'card-rect')
                .attr('width', cardWidth)
                .attr('height', cardHeight)
                .attr('rx', 12)
                .attr('ry', 12)
                .style('fill', categories[item.category].color)
                .style('stroke', '#000')
                .style('stroke-width', '3px')
                .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))');

            // 接続ポイントのインジケーター（右側）
            card.append('circle')
                .attr('class', 'connection-point-out')
                .attr('cx', cardWidth)
                .attr('cy', cardHeight / 2)
                .attr('r', 3)
                .attr('fill', '#000')
                .attr('opacity', 0.5)
                .style('pointer-events', 'none');

            // 接続ポイントのインジケーター（左側）
            card.append('circle')
                .attr('class', 'connection-point-in')
                .attr('cx', 0)
                .attr('cy', cardHeight / 2)
                .attr('r', 3)
                .attr('fill', '#000')
                .attr('opacity', 0.5)
                .style('pointer-events', 'none');

            // Card text using SVG text elements instead of foreignObject
            const textGroup = card.append('g')
                .attr('class', 'card-text')
                .style('pointer-events', 'none');

            // Split text into lines for better display
            const words = item.text.split(' ');
            const lines = [];
            const maxCharsPerLine = Math.floor(cardWidth / 8); // Approximate characters per line
            let currentLine = '';

            for (const word of words) {
                if ((currentLine + word).length <= maxCharsPerLine) {
                    currentLine += (currentLine ? ' ' : '') + word;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);

            // Limit to maximum 3 lines
            const displayLines = lines.slice(0, 3);
            if (lines.length > 3) {
                displayLines[2] = displayLines[2].substring(0, maxCharsPerLine - 3) + '...';
            }

            // Draw text lines
            const lineHeight = 12;
            const startY = cardHeight / 2 - ((displayLines.length - 1) * lineHeight / 2);

            displayLines.forEach((line, index) => {
                textGroup.append('text')
                    .attr('x', cardWidth / 2)
                    .attr('y', startY + (index * lineHeight))
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('font-family', 'Arial, sans-serif')
                    .attr('font-size', '11px')
                    .attr('font-weight', '700')
                    .attr('fill', '#ffffff')
                    .text(line);
            });
        });
    }

    function drawConnections() {
        console.log('Drawing connections:', modelData.connections);
        
        const connectionGroup = svg.append('g').attr('class', 'connections');
        
        modelData.connections.forEach(connection => {
            const sourceItem = modelData.items.find(item => item.id === connection.source);
            const targetItem = modelData.items.find(item => item.id === connection.target);
            
            if (!sourceItem || !targetItem) {
                console.warn('Source or target not found for connection:', connection);
                return;
            }

            // 接続ポイントを改善：カードの右端中央から左端中央へ
            const startX = sourceItem.x + cardWidth;
            const startY = sourceItem.y + cardHeight / 2;
            const endX = targetItem.x;
            const endY = targetItem.y + cardHeight / 2;
            
            // 美しい曲線を作成
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // 制御点の計算を改善
            let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // 水平方向の移動が大きい場合
                const controlOffset = Math.max(50, Math.abs(deltaX) * 0.4);
                controlPoint1X = startX + controlOffset;
                controlPoint1Y = startY;
                controlPoint2X = endX - controlOffset;
                controlPoint2Y = endY;
            } else {
                // 垂直方向の移動が大きい場合
                const controlOffset = Math.max(30, Math.abs(deltaY) * 0.3);
                controlPoint1X = startX + Math.abs(deltaX) * 0.3;
                controlPoint1Y = startY + (deltaY > 0 ? controlOffset : -controlOffset);
                controlPoint2X = endX - Math.abs(deltaX) * 0.3;
                controlPoint2Y = endY - (deltaY > 0 ? controlOffset : -controlOffset);
            }
            
            const pathData = `M ${startX},${startY} C ${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${endX},${endY}`;
            
            console.log('Drawing path:', pathData);
            
            connectionGroup.append('path')
                .attr('class', 'connection')
                .attr('d', pathData)
                .attr('stroke', '#000')
                .attr('stroke-width', '2')
                .attr('fill', 'none')
                .attr('opacity', '0.8')
                .attr('marker-end', 'url(#arrowhead)')
                .style('cursor', 'pointer')
                .style('stroke-linejoin', 'round')
                .style('stroke-linecap', 'round')
                .on('dblclick', function(event) { handleConnectionDblClick(event, connection); })
                .on('mouseover', function() {
                    d3.select(this)
                        .attr('stroke', '#000')
                        .attr('stroke-width', '3')
                        .attr('opacity', '1');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .attr('stroke', '#000')
                        .attr('stroke-width', '2')
                        .attr('opacity', '0.8');
                });
        });
        
        console.log('Connections drawn:', modelData.connections.length);
    }

    // --- Data Management Functions ---
    function saveToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(modelData));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // データの整合性チェック
                if (parsed.items && Array.isArray(parsed.items) && 
                    parsed.connections && Array.isArray(parsed.connections)) {
                    modelData = parsed;
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
        return false;
    }

    function exportToJSON() {
        const dataToExport = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            data: modelData
        };
        
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `logic-model-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('JSONファイルをダウンロードしました。');
    }

    function importFromJSON(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                
                // データ形式の確認
                let dataToImport;
                if (imported.data && imported.data.items && imported.data.connections) {
                    // 新形式（バージョン情報付き）
                    dataToImport = imported.data;
                } else if (imported.items && imported.connections) {
                    // 旧形式（直接データ）
                    dataToImport = imported;
                } else {
                    throw new Error('Invalid data format');
                }
                
                // データの整合性チェック
                if (!Array.isArray(dataToImport.items) || !Array.isArray(dataToImport.connections)) {
                    throw new Error('Invalid data structure');
                }
                
                // アイテムの必須フィールドチェック
                for (const item of dataToImport.items) {
                    if (!item.id || !item.text || !item.category) {
                        throw new Error('Invalid item data');
                    }
                    // カテゴリの存在確認
                    if (!categories[item.category]) {
                        console.warn(`Unknown category: ${item.category}, setting to 'inputs'`);
                        item.category = 'inputs';
                    }
                }
                
                // 接続の整合性チェック
                for (const connection of dataToImport.connections) {
                    if (!connection.id || !connection.source || !connection.target) {
                        throw new Error('Invalid connection data');
                    }
                }
                
                modelData = dataToImport;
                saveToLocalStorage();
                drawModel();
                showMessage('データを正常に読み込みました。');
                
            } catch (error) {
                console.error('Import error:', error);
                alert('ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。');
            }
        };
        reader.readAsText(file);
    }

    function createNewModel() {
        if (modelData.items.length > 0 || modelData.connections.length > 0) {
            if (!confirm('現在のデータは失われます。新規作成を続けますか？')) {
                return;
            }
        }
        
        modelData = { items: [], connections: [] };
        saveToLocalStorage();
        drawModel();
        window.showMessage('新しいロジックモデルを作成しました。');
    }
    addItemModalBtn.addEventListener('click', () => {
        addModalInput.value = '';
        addModalCategory.value = 'inputs';
        updateCharacterCount('add-modal-input', 'add-char-count');
        addItemModal.style.display = 'block';
    });

    function addNewItem() {
        const text = addModalInput.value.trim();
        const category = addModalCategory.value;
        if (!text) { 
            alert('内容を入力してください。'); 
            return; 
        }
        if (text.length > 30) {
            alert('内容は30文字以内で入力してください。');
            return;
        }
        const newItem = { 
            id: uuidv4(), 
            text: text, 
            category: category,
            x: 0,
            y: 0
        };
        modelData.items.push(newItem);
        saveToLocalStorage(); // データ保存
        closeAddModal();
        drawModel();
        showMessage('項目を追加しました。');
    }

    function updateCharacterCount(inputId, countId) {
        const input = document.getElementById(inputId);
        const countElement = document.getElementById(countId);
        if (input && countElement) {
            const currentLength = input.value.length;
            countElement.textContent = `${currentLength}/30文字`;
            countElement.style.color = currentLength > 30 ? '#ff0000' : '#666666';
        }
    }

    function closeAddModal() {
        addItemModal.style.display = 'none';
        addModalInput.value = '';
        addModalCategory.value = 'inputs';
    }

    function handleCardClick(event, item) {
        event.stopPropagation();
        
        setTimeout(() => {
            if (!lineDrawingState.startCardId) {
                // Start connection
                lineDrawingState.startCardId = item.id;
                
                // 選択されたカードをハイライト
                d3.selectAll('.logic-card').classed('selected-for-connection', false);
                d3.selectAll('.logic-card').classed('connectable-target', false);
                
                const selectedCard = d3.selectAll('.logic-card').filter(function() {
                    const cardData = d3.select(this).datum();
                    return cardData && cardData.id === item.id;
                });
                selectedCard.classed('selected-for-connection', true);
                
                // 接続可能なカードをハイライト
                const startIndex = columnOrder.indexOf(item.category);
                const targetCategoryIndex = startIndex + 1;
                
                if (targetCategoryIndex < columnOrder.length) {
                    const targetCategory = columnOrder[targetCategoryIndex];
                    
                    d3.selectAll('.logic-card').filter(function() {
                        const cardData = d3.select(this).datum();
                        return cardData && cardData.category === targetCategory;
                    }).classed('connectable-target', true);
                    
                    window.showMessage(`${categories[targetCategory].label}の項目をクリックして矢印を作成してください。`);
                } else {
                    window.showMessage('この項目からは矢印を引けません（最後のステージです）。');
                    // Reset selection
                    d3.selectAll('.logic-card').classed('selected-for-connection', false);
                    lineDrawingState.startCardId = null;
                }
            } else {
                if (lineDrawingState.startCardId !== item.id) {
                    // 開始カードを取得
                    const startCard = modelData.items.find(i => i.id === lineDrawingState.startCardId);
                    const endCard = item;
                    
                    // 同じカテゴリ内での接続を禁止
                    if (startCard.category === endCard.category) {
                        window.showMessage('同じカテゴリ内では矢印を引けません。');
                        // Reset selection
                        d3.selectAll('.logic-card').classed('selected-for-connection', false);
                        d3.selectAll('.logic-card').classed('connectable-target', false);
                        lineDrawingState.startCardId = null;
                        return;
                    }
                    
                    // 隣接するカテゴリのみに接続を制限
                    const startIndex = columnOrder.indexOf(startCard.category);
                    const endIndex = columnOrder.indexOf(endCard.category);
                    
                    // 隣接チェック：終点は開始点の次のカテゴリのみ許可（左から右への流れ）
                    if (endIndex !== startIndex + 1) {
                        if (endIndex < startIndex) {
                            window.showMessage('矢印は左から右の方向にのみ引けます。');
                        } else if (endIndex > startIndex + 1) {
                            window.showMessage('矢印は隣接するカテゴリにのみ引けます。');
                        }
                        // Reset selection
                        d3.selectAll('.logic-card').classed('selected-for-connection', false);
                        d3.selectAll('.logic-card').classed('connectable-target', false);
                        lineDrawingState.startCardId = null;
                        return;
                    }
                    
                    // Create connection
                    const existingConnection = modelData.connections.find(c => 
                        c.source === lineDrawingState.startCardId && c.target === item.id
                    );
                    
                    if (!existingConnection) {
                        const newConnection = { 
                            id: uuidv4(), 
                            source: lineDrawingState.startCardId, 
                            target: item.id 
                        };
                        modelData.connections.push(newConnection);
                        saveToLocalStorage(); // データ保存
                        console.log('Connection created:', newConnection);
                        window.showMessage('矢印を作成しました。');
                        drawModel();
                    } else {
                        window.showMessage('この矢印は既に存在します。');
                    }
                } else {
                    window.showMessage('同じカードには矢印を引けません。');
                }
                
                // Reset selection
                d3.selectAll('.logic-card').classed('selected-for-connection', false);
                d3.selectAll('.logic-card').classed('connectable-target', false);
                lineDrawingState.startCardId = null;
            }
        }, 100);
    }

    function handleDblClick(event, item) {
        event.stopPropagation();
        event.preventDefault();
        
        console.log('Double click on item:', item);
        
        cancelLineDrawing();
        currentEditData = item;
        setupEditModal(item);
        editModal.style.display = 'block';
        
        console.log('Edit modal should be visible now');
    }

    function handleConnectionDblClick(event, connection) {
        event.stopPropagation();
        if (confirm('この矢印を削除しますか？')) {
            modelData.connections = modelData.connections.filter(c => c.id !== connection.id);
            saveToLocalStorage(); // データ保存
            drawModel();
            showMessage('矢印を削除しました。');
        }
    }

    function cancelLineDrawing() {
        if (lineDrawingState.startCardId) {
            d3.selectAll('.logic-card').classed('selected-for-connection', false);
            d3.selectAll('.logic-card').classed('connectable-target', false);
            lineDrawingState.startCardId = null;
            window.showMessage('矢印の描画をキャンセルしました。');
        }
    }

    function setupEditModal(item) {
        console.log('Setting up edit modal for item:', item);
        modalInput.value = item.text;
        
        // Remove existing elements first
        const existingSelect = document.getElementById('modal-category-select');
        if (existingSelect) {
            existingSelect.remove();
        }
        
        const existingLabel = document.querySelector('label[for="modal-category-select"]');
        if (existingLabel) {
            existingLabel.remove();
        }
        
        const existingCharCount = document.getElementById('edit-char-count');
        if (existingCharCount) {
            existingCharCount.remove();
        }
        
        // Create category select
        const categorySelect = document.createElement('select');
        categorySelect.id = 'modal-category-select';
        categorySelect.style.width = '100%';
        categorySelect.style.marginTop = '10px';
        categorySelect.style.padding = '8px';
        categorySelect.style.border = '2px solid #2F3E46';
        categorySelect.style.borderRadius = '8px';
        categorySelect.style.fontSize = '14px';
        
        // Add options to select
        Object.keys(categories).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = categories[key].label;
            if (key === item.category) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
        
        // Create label for category select
        const categoryLabel = document.createElement('label');
        categoryLabel.setAttribute('for', 'modal-category-select');
        categoryLabel.textContent = 'ステージ（カテゴリ）:';
        categoryLabel.style.display = 'block';
        categoryLabel.style.marginTop = '15px';
        categoryLabel.style.marginBottom = '5px';
        categoryLabel.style.fontWeight = 'bold';
        categoryLabel.style.color = '#2F3E46';
        
        // Create character count display
        const editCharCount = document.createElement('div');
        editCharCount.id = 'edit-char-count';
        editCharCount.style.fontSize = '12px';
        editCharCount.style.color = '#666666';
        editCharCount.style.marginTop = '5px';
        editCharCount.style.textAlign = 'right';
        
        // Add elements to modal body
        const modalBody = document.querySelector('#edit-modal .modal-body');
        if (modalBody) {
            modalBody.appendChild(editCharCount);
            modalBody.appendChild(categoryLabel);
            modalBody.appendChild(categorySelect);
            console.log('Category select added to modal body');
        } else {
            console.error('Modal body not found');
        }
        
        // Update modal label
        modalLabel.textContent = '内容を編集し、必要に応じてステージを変更してください:';
        
        // Update character count initially
        updateCharacterCount('modal-input', 'edit-char-count');
        
        console.log('Edit modal setup completed');
    }
    
    function saveEdit() { 
        console.log('Saving edit for item:', currentEditData);
        
        if (currentEditData && modalInput.value.trim()) {
            const text = modalInput.value.trim();
            if (text.length > 30) {
                alert('内容は30文字以内で入力してください。');
                return;
            }
            
            const oldCategory = currentEditData.category;
            currentEditData.text = text;
            
            const categorySelect = document.getElementById('modal-category-select');
            console.log('Category select found:', categorySelect);
            console.log('Selected value:', categorySelect ? categorySelect.value : 'null');
            console.log('Current category:', oldCategory);
            
            if (categorySelect && categorySelect.value !== oldCategory) {
                // カテゴリが変更された場合、関連する矢印を削除
                const itemId = currentEditData.id;
                const connectionsToRemove = modelData.connections.filter(connection => 
                    connection.source === itemId || connection.target === itemId
                );
                
                if (connectionsToRemove.length > 0) {
                    // 矢印を削除
                    modelData.connections = modelData.connections.filter(connection => 
                        connection.source !== itemId && connection.target !== itemId
                    );
                    
                    console.log(`Removed ${connectionsToRemove.length} connections for item ${itemId}`);
                    
                    // カテゴリを変更
                    currentEditData.category = categorySelect.value;
                    
                    if (window.showMessage) {
                        window.showMessage(`項目を更新し、ステージを移動しました。関連する矢印${connectionsToRemove.length}本を削除しました。`);
                    }
                } else {
                    // 矢印がない場合は通常のメッセージ
                    currentEditData.category = categorySelect.value;
                    
                    if (window.showMessage) {
                        window.showMessage('項目を更新し、ステージを移動しました。');
                    }
                }
                
                console.log('Category changed from', oldCategory, 'to', categorySelect.value);
            } else {
                console.log('Category not changed');
                if (window.showMessage) {
                    window.showMessage('項目を更新しました。');
                }
            }
            
            saveToLocalStorage(); // データ保存
            drawModel();
            console.log('Edit saved successfully');
        } else {
            console.log('Save failed: missing data or empty text');
        }
        closeModal(); 
    }
    
    function deleteItem() { 
        if (currentEditData) {
            if (confirm('この項目を削除しますか？関連する矢印も削除されます。')) {
                modelData.items = modelData.items.filter(item => item.id !== currentEditData.id); 
                modelData.connections = modelData.connections.filter(c => 
                    c.source !== currentEditData.id && c.target !== currentEditData.id
                ); 
                saveToLocalStorage(); // データ保存
                drawModel();
                showMessage('項目を削除しました。');
            }
        } 
        closeModal(); 
    }
    
    function closeModal() { 
        console.log('Closing modal');
        editModal.style.display = 'none'; 
        currentEditData = null;
        
        // Remove category select
        const categorySelect = document.getElementById('modal-category-select');
        if (categorySelect) {
            categorySelect.remove();
            console.log('Category select removed');
        }
        
        // Remove character count display
        const editCharCount = document.getElementById('edit-char-count');
        if (editCharCount) {
            editCharCount.remove();
            console.log('Character count removed');
        }
        
        // Remove category label
        const modalBody = document.querySelector('#edit-modal .modal-body');
        if (modalBody) {
            const categoryLabels = modalBody.querySelectorAll('label[for="modal-category-select"]');
            categoryLabels.forEach(label => {
                label.remove();
                console.log('Category label removed');
            });
            
            // Also remove any labels with the specific text (fallback)
            const allLabels = modalBody.querySelectorAll('label');
            allLabels.forEach(label => {
                if (label.textContent === 'ステージ（カテゴリ）:') {
                    label.remove();
                    console.log('Category label removed by text match');
                }
            });
        }
        
        // Reset modal label
        modalLabel.textContent = '内容を編集してください:';
        console.log('Modal closed and cleaned up');
    }

    window.showMessage = function(message) {
        const existingMessage = document.getElementById('temp-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.id = 'temp-message';
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.bottom = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.background = '#2F3E46';
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '12px 18px';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.zIndex = '1001';
        messageDiv.style.fontSize = '14px';
        messageDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        messageDiv.style.maxWidth = '300px';
        messageDiv.style.wordWrap = 'break-word';
        messageDiv.style.lineHeight = '1.4';
        messageDiv.style.cursor = 'pointer';  // クリック可能であることを示す
        
        // アニメーション効果を追加
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        messageDiv.style.transition = 'all 0.3s ease-out';
        
        // クリックで閉じる機能
        const closeMessage = () => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        };
        
        messageDiv.addEventListener('click', closeMessage);
        
        // ホバー効果
        messageDiv.addEventListener('mouseenter', () => {
            messageDiv.style.background = '#3a4f57';
        });
        
        messageDiv.addEventListener('mouseleave', () => {
            messageDiv.style.background = '#2F3E46';
        });
        
        document.body.appendChild(messageDiv);
        
        // アニメーション開始
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
        
        // 自動で閉じるタイマー
        const autoCloseTimer = setTimeout(closeMessage, 2000);
        
        // クリックされた場合はタイマーをクリア
        messageDiv.addEventListener('click', () => {
            clearTimeout(autoCloseTimer);
        });
    }

    // Background click to cancel line drawing
    svg.on('click', cancelLineDrawing);
    window.addEventListener('keydown', (e) => { 
        if (e.key === 'Escape') cancelLineDrawing(); 
    });

    // Modal event listeners
    addModalSave.addEventListener('click', addNewItem);
    addModalCancel.addEventListener('click', closeAddModal);
    addModalClose.addEventListener('click', closeAddModal);
    
    // Enterキーで項目追加
    addModalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addNewItem();
        }
    });
    
    // Character count for add modal
    addModalInput.addEventListener('input', () => {
        updateCharacterCount('add-modal-input', 'add-char-count');
    });
    
    // Character count for edit modal
    modalInput.addEventListener('input', () => {
        updateCharacterCount('modal-input', 'edit-char-count');
    });
    
    // Header button event handlers
    if (newBtn) {
        newBtn.addEventListener('click', createNewModel);
        console.log('New button event listener added');
    } else {
        console.error('New button not found');
    }
    
    if (loadJsonBtn) {
        loadJsonBtn.addEventListener('click', () => {
            console.log('Load JSON button clicked');
            jsonFileInput.click();
        });
        console.log('Load JSON button event listener added');
    } else {
        console.error('Load JSON button not found');
    }
    
    if (jsonFileInput) {
        jsonFileInput.addEventListener('change', (e) => {
            console.log('File input changed');
            if (e.target.files.length > 0) {
                importFromJSON(e.target.files[0]);
                e.target.value = ''; // Reset file input
            }
        });
        console.log('JSON file input event listener added');
    } else {
        console.error('JSON file input not found');
    }
    
    if (saveJsonBtn) {
        saveJsonBtn.addEventListener('click', exportToJSON);
        console.log('Save JSON button event listener added');
    } else {
        console.error('Save JSON button not found');
    }
    
    // Hamburger menu functionality
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    console.log('Hamburger button:', hamburgerBtn);
    console.log('Nav menu:', navMenu);
    
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            console.log('Hamburger button clicked');
            navMenu.classList.toggle('active');
            hamburgerBtn.classList.toggle('active');
            console.log('Nav menu active:', navMenu.classList.contains('active'));
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburgerBtn.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                console.log('Menu closed by outside click');
            }
        });
        
        console.log('Hamburger menu event listeners added');
    } else {
        console.error('Hamburger button or nav menu not found');
    }
    
    modalSave.addEventListener('click', saveEdit);
    modalDelete.addEventListener('click', deleteItem);
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);

    // Background click to cancel line drawing
    svg.on('click', cancelLineDrawing);
    window.addEventListener('keydown', (e) => { 
        if (e.key === 'Escape') cancelLineDrawing(); 
    });

    // Window resize
    window.addEventListener('resize', drawModel);
    
    // Initial setup
    function initializeApp() {
        const hasData = loadFromLocalStorage();
        if (!hasData) {
            // 初期状態は空のモデルから開始
            modelData = { items: [], connections: [] };
            console.log('Starting with empty model');
        }
        drawModel();
    }
    
    // 開発者向け: ローカルストレージを完全にクリアする関数
    // ブラウザのコンソールで window.clearAllData() を実行すると使用可能
    window.clearAllData = function() {
        if (confirm('すべてのローカルデータを削除します。この操作は取り消せません。続行しますか？')) {
            localStorage.removeItem(STORAGE_KEY);
            modelData = { items: [], connections: [] };
            drawModel();
            window.showMessage('すべてのデータを削除しました。');
            console.log('All local data cleared');
        }
    };
    
    // --- PNG Export ---
    async function exportToPNG() {
        try {
            console.log('Starting PNG export with html2canvas...');
            
            // 現在のデータを保存
            saveToLocalStorage();
            
            // SVG要素とコンテナを取得
            const svgContainer = document.getElementById('logic-model');
            const svgElement = document.getElementById('model-svg');
            if (!svgContainer || !svgElement) {
                throw new Error('SVG container or element not found');
            }
            
            // 元のスタイルを保存
            const originalContainerStyle = svgContainer.style.cssText;
            const originalSvgStyle = svgElement.style.cssText;
            const originalViewBox = svgElement.getAttribute('viewBox');
            const originalWidth = svgElement.getAttribute('width');
            const originalHeight = svgElement.getAttribute('height');
            
            // コンテンツのサイズを動的に計算
            const numColumns = Object.keys(categories).length; // 6列
            const fixedColumnWidth = 180; // 各列の固定幅
            const contentWidth = numColumns * fixedColumnWidth;
            
            // 各カテゴリの項目数を計算して最大高さを求める
            let maxItemsInColumn = 0;
            Object.keys(categories).forEach(category => {
                const itemsInCategory = modelData.items.filter(item => item.category === category).length;
                maxItemsInColumn = Math.max(maxItemsInColumn, itemsInCategory);
            });
            
            // 高さを動的に計算
            const titleHeight = 50;
            const cardHeight = 77;
            const cardVMargin = 35;
            const minHeight = 400; // 最小高さ
            
            const calculatedHeight = titleHeight + (maxItemsInColumn * (cardHeight + cardVMargin)) + cardVMargin + 50; // 下部余白
            const contentHeight = Math.max(minHeight, calculatedHeight);
            
            const padding = 40;
            const exportWidth = contentWidth + padding * 2;
            const exportHeight = contentHeight + padding * 2;
            
            console.log('Export dimensions:', { 
                exportWidth, 
                exportHeight, 
                contentWidth, 
                contentHeight, 
                maxItemsInColumn,
                calculatedHeight
            });
            
            // コンテナのスタイル設定（中央配置を確実にする）
            svgContainer.style.position = 'relative';
            svgContainer.style.width = `${exportWidth}px`;
            svgContainer.style.height = `${exportHeight}px`;
            svgContainer.style.margin = '0';
            svgContainer.style.backgroundColor = 'white';
            svgContainer.style.display = 'flex';
            svgContainer.style.justifyContent = 'center';
            svgContainer.style.alignItems = 'flex-start';
            svgContainer.style.padding = `${padding}px`;
            svgContainer.style.boxSizing = 'border-box';
            svgContainer.style.overflow = 'visible';
            
            // SVG要素のサイズ設定
            svgElement.setAttribute('width', contentWidth);
            svgElement.setAttribute('height', contentHeight);
            svgElement.setAttribute('viewBox', `0 0 ${contentWidth} ${contentHeight}`);
            svgElement.style.width = `${contentWidth}px`;
            svgElement.style.height = `${contentHeight}px`;
            svgElement.style.display = 'block';
            svgElement.style.margin = '0 auto';
            
            // PNG出力用の固定サイズ計算を使用
            calculateDimensionsForExport(contentWidth);
            
            // 再描画
            drawModel();
            
            // 少し待ってから html2canvas でキャプチャ
            setTimeout(async () => {
                try {
                    const canvas = await html2canvas(svgContainer, {
                        backgroundColor: '#ffffff',
                        scale: 2, // 高解像度
                        useCORS: true,
                        allowTaint: false,
                        foreignObjectRendering: false,
                        logging: false,
                        width: exportWidth,
                        height: exportHeight,
                        x: 0,
                        y: 0,
                        scrollX: 0,
                        scrollY: 0
                    });
                    
                    // PNGとして保存
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            throw new Error('Failed to create PNG blob');
                        }
                        
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = `logic-model-${new Date().toISOString().split('T')[0]}.png`;
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);
                        
                        if (window.showMessage) {
                            window.showMessage('PNG画像をダウンロードしました。');
                        }
                    }, 'image/png', 0.95);
                    
                } catch (error) {
                    console.error('html2canvas error:', error);
                    // フォールバック: SVG出力
                    await fallbackToSVG();
                } finally {
                    // スタイルを元に戻す
                    restoreOriginalStyles();
                }
            }, 300); // 少し長めに待機

            function restoreOriginalStyles() {
                svgContainer.style.cssText = originalContainerStyle;
                svgElement.style.cssText = originalSvgStyle;
                
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
                
                // 通常表示用の計算方法に戻して再描画
                calculateDimensions();
                drawModel();
            }

        } catch (error) {
            console.error('PNG Export failed:', error);
            alert(`PNGエクスポートに失敗しました: ${error.message}`);
        }
    }
    
    // フォールバック: SVG出力
    async function fallbackToSVG() {
        try {
            const svgElement = document.getElementById('model-svg');
            if (!svgElement) return;
            
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `logic-model-${new Date().toISOString().split('T')[0]}.svg`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            
            if (window.showMessage) {
                window.showMessage('PNG変換に失敗したため、SVG画像をダウンロードしました。');
            }
        } catch (error) {
            console.error('SVG fallback failed:', error);
            alert('画像の出力に失敗しました。');
        }
    }
    
    // PNG export button event handler
    if (exportPngBtn) {
        exportPngBtn.addEventListener('click', exportToPNG);
        console.log('PNG export button event listener added');
    } else {
        console.error('PNG export button not found');
    }
    
    initializeApp();
});

// --- PNG Export ---
async function exportToPNG() {
    try {
        console.log('Starting PNG export...');
        const svgElement = document.getElementById('model-svg');
        if (!svgElement) {
            throw new Error('SVG element not found');
        }
        
        // 現在のデータを保存
        saveToLocalStorage();
        
        // コンテンツサイズを動的に計算
        const numColumns = Object.keys(categories).length;
        const fixedColumnWidth = 180;
        const contentWidth = numColumns * fixedColumnWidth;
        
        // 各カテゴリの項目数を計算して最大高さを求める
        let maxItemsInColumn = 0;
        Object.keys(categories).forEach(category => {
            const itemsInCategory = modelData.items.filter(item => item.category === category).length;
            maxItemsInColumn = Math.max(maxItemsInColumn, itemsInCategory);
        });
        
        // 高さを動的に計算
        const titleHeight = 50;
        const cardHeight = 77;
        const cardVMargin = 35;
        const minHeight = 400;
        const calculatedHeight = titleHeight + (maxItemsInColumn * (cardHeight + cardVMargin)) + cardVMargin + 50;
        const contentHeight = Math.max(minHeight, calculatedHeight);
        
        const padding = 40;
        const exportWidth = contentWidth + padding * 2;
        const exportHeight = contentHeight + padding * 2;
        
        // 一時的にSVGのサイズを設定
        const originalViewBox = svgElement.getAttribute('viewBox');
        const originalWidth = svgElement.getAttribute('width');
        const originalHeight = svgElement.getAttribute('height');
        
        svgElement.setAttribute('width', contentWidth);
        svgElement.setAttribute('height', contentHeight);
        svgElement.setAttribute('viewBox', `0 0 ${contentWidth} ${contentHeight}`);
        
        // PNG出力用の固定サイズ計算を使用
        calculateDimensionsForExport(contentWidth);
        
        // エクスポート用に再描画
        drawModel();
        
        // 少し待ってからSVGを取得（描画完了を待つ）
        setTimeout(() => {
            // SVGを文字列として取得
            const svgString = new XMLSerializer().serializeToString(svgElement);
            
            // Canvasを作成
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = 2; // 高解像度
            canvas.width = exportWidth * scale;
            canvas.height = exportHeight * scale;
            ctx.scale(scale, scale);
            
            // 背景を白に設定
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, exportWidth, exportHeight);
            
            // SVGをImageに変換
            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                // 画像をcanvasの中央に描画（パディングを考慮）
                ctx.drawImage(img, padding, padding, contentWidth, contentHeight);
                
                // PNGとして保存
                canvas.toBlob((blob) => {
                    if (!blob) {
                        throw new Error('Failed to create PNG blob');
                    }
                    
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `logic-model-${new Date().toISOString().split('T')[0]}.png`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                    
                    if (window.showMessage) {
                        window.showMessage('PNG画像をダウンロードしました。');
                    }
                }, 'image/png', 0.95);
                
                // リソースをクリーンアップ
                URL.revokeObjectURL(url);
                
                // SVGの属性を元に戻す
                restoreSVGAttributes();
            };
            
            img.onerror = (error) => {
                console.error('PNG出力エラー:', error);
                alert('PNG出力に失敗しました。');
                URL.revokeObjectURL(url);
                
                // エラー時もSVGの属性を元に戻す
                restoreSVGAttributes();
            };
            
            function restoreSVGAttributes() {
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
                
                // 通常表示用の計算方法に戻して再描画
                calculateDimensions();
                drawModel();
            }
            
            img.src = url;
        }, 100); // 100ms待機

    } catch (error) {
        console.error('PNG Export failed:', error);
        alert(`PNGエクスポートに失敗しました: ${error.message}`);
    }
}

async function drawModelToCanvas(ctx, width, height) {
    // Calculate dimensions
    const numColumns = columnOrder.length;
    const colWidth = width / numColumns;
    const cardW = colWidth - 40;
    const cardH = 77;
    const cardVMargin = 35;
    const titleHeight = 50;

    // Draw columns background
    columnOrder.forEach((category, i) => {
        const x = i * colWidth;
        
        // Column background
        ctx.fillStyle = '#fdfdfd';
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.fillRect(x, 0, colWidth, height);
        ctx.strokeRect(x, 0, colWidth, height);
        
        // Column title
        ctx.fillStyle = '#2F3E46';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(categories[category].label, x + colWidth / 2, 30);
    });

    // Draw connections first (behind cards)
    modelData.connections.forEach(connection => {
        const sourceItem = modelData.items.find(item => item.id === connection.source);
        const targetItem = modelData.items.find(item => item.id === connection.target);
        
        if (!sourceItem || !targetItem) return;

        // Update positions
        const sourceIndex = columnOrder.indexOf(sourceItem.category);
        const targetIndex = columnOrder.indexOf(targetItem.category);
        const sourceCategoryItems = modelData.items.filter(item => item.category === sourceItem.category);
        const targetCategoryItems = modelData.items.filter(item => item.category === targetItem.category);
        const sourceItemIndex = sourceCategoryItems.findIndex(item => item.id === sourceItem.id);
        const targetItemIndex = targetCategoryItems.findIndex(item => item.id === targetItem.id);

        const sourceX = sourceIndex * colWidth + (colWidth - cardW) / 2;
        const sourceY = titleHeight + sourceItemIndex * (cardH + cardVMargin) + cardVMargin;
        const targetX = targetIndex * colWidth + (colWidth - cardW) / 2;
        const targetY = titleHeight + targetItemIndex * (cardH + cardVMargin) + cardVMargin;

        // Draw arrow
        const startX = sourceX + cardW;
        const startY = sourceY + cardH / 2;
        const endX = targetX;
        const endY = targetY + cardH / 2;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Create curved path
        const deltaX = endX - startX;
        const controlOffset = Math.max(50, Math.abs(deltaX) * 0.4);
        const cp1X = startX + controlOffset;
        const cp1Y = startY;
        const cp2X = endX - controlOffset;
        const cp2Y = endY;
        
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(endY - cp2Y, endX - cp2X);
        const arrowLength = 10;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    });

    // Draw cards
    modelData.items.forEach(item => {
        const categoryIndex = columnOrder.indexOf(item.category);
        const categoryItems = modelData.items.filter(i => i.category === item.category);
        const itemIndex = categoryItems.findIndex(i => i.id === item.id);
        
        const x = categoryIndex * colWidth + (colWidth - cardW) / 2;
        const y = titleHeight + itemIndex * (cardH + cardVMargin) + cardVMargin;

        // Draw card background
        ctx.fillStyle = categories[item.category].color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        
        // Rounded rectangle
        const radius = 12;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + cardW - radius, y);
        ctx.quadraticCurveTo(x + cardW, y, x + cardW, y + radius);
        ctx.lineTo(x + cardW, y + cardH - radius);
        ctx.quadraticCurveTo(x + cardW, y + cardH, x + cardW - radius, y + cardH);
        ctx.lineTo(x + radius, y + cardH);
        ctx.quadraticCurveTo(x, y + cardH, x, y + cardH - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Split text into lines
        const maxWidth = cardW - 24; // padding
        const words = item.text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        // Limit to 3 lines
        const displayLines = lines.slice(0, 3);
        if (lines.length > 3) {
            displayLines[2] = displayLines[2].substring(0, displayLines[2].length - 3) + '...';
        }

        // Draw lines
        const lineHeight = 12;
        const textStartY = y + cardH / 2 - ((displayLines.length - 1) * lineHeight / 2);
        
        displayLines.forEach((line, index) => {
            ctx.fillText(line, x + cardW / 2, textStartY + (index * lineHeight));
        });

        // Draw connection points
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x + cardW, y + cardH / 2, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + cardH / 2, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

async function exportAsPNG(svgData, width, height) {
    // Create Canvas
    const canvas = document.createElement('canvas');
    
    // Increase resolution for better quality
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Add a white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Replace foreignObject with native SVG text to avoid CORS issues
    let cleanSvgData = svgData;
    
    // First, collect all card positions from transform attributes
    const cardPositions = new Map();
    const cardMatches = cleanSvgData.match(/<g[^>]*class="logic-card"[^>]*transform="translate\(([^,]+),([^)]+)\)"[^>]*>[\s\S]*?<\/g>/g);
    
    if (cardMatches) {
        cardMatches.forEach(cardMatch => {
            const transformMatch = cardMatch.match(/transform="translate\(([^,]+),([^)]+)\)"/);
            const foreignObjectMatch = cardMatch.match(/<foreignObject[^>]*>([\s\S]*?)<\/foreignObject>/);
            
            if (transformMatch && foreignObjectMatch) {
                const x = parseFloat(transformMatch[1]);
                const y = parseFloat(transformMatch[2]);
                
                // Extract text from foreignObject
                const htmlContent = foreignObjectMatch[1].match(/<xhtml:div[^>]*>([\s\S]*?)<\/xhtml:div>/);
                let text = '';
                if (htmlContent) {
                    text = htmlContent[1].replace(/<[^>]*>/g, '').trim();
                }
                
                if (text) {
                    cardPositions.set(foreignObjectMatch[0], { x, y, text });
                }
            }
        });
    }
    
    // Remove foreignObject elements and replace with SVG text
    cleanSvgData = cleanSvgData.replace(/<foreignObject[^>]*>[\s\S]*?<\/foreignObject>/g, (match) => {
        const positionData = cardPositions.get(match);
        
        if (!positionData) {
            console.warn('Could not find position data for foreignObject');
            return '';
        }
        
        const { x, y, text } = positionData;
        
        // Extract size attributes from foreignObject
        const widthMatch = match.match(/width="([^"]+)"/);
        const heightMatch = match.match(/height="([^"]+)"/);
        
        const objWidth = widthMatch ? parseFloat(widthMatch[1]) : cardWidth;
        const objHeight = heightMatch ? parseFloat(heightMatch[1]) : cardHeight;
        
        console.log('Processing text:', text, 'at position:', { x, y, width: objWidth, height: objHeight });
        
        // Calculate text position (center of the card)
        const textX = x + objWidth / 2;
        const textY = y + objHeight / 2;
        
        // Split text into multiple lines if it's too long
        const maxCharsPerLine = Math.floor(objWidth / 8); // Approximate characters per line
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            if ((currentLine + word).length <= maxCharsPerLine) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        
        // Limit to maximum 3 lines
        const displayLines = lines.slice(0, 3);
        if (lines.length > 3) {
            displayLines[2] = displayLines[2].substring(0, maxCharsPerLine - 3) + '...';
        }
        
        // Create multiple tspan elements for multi-line text
        const lineHeight = 12;
        const startY = textY - ((displayLines.length - 1) * lineHeight / 2);
        
        let textElements = displayLines.map((line, index) => 
            `<tspan x="${textX}" y="${startY + (index * lineHeight)}">${line}</tspan>`
        ).join('');
        
        // Create SVG text element instead of foreignObject
        const svgText = `<text text-anchor="middle" dominant-baseline="middle" 
                font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="white">
                ${textElements}
                </text>`;
        
        console.log('Generated SVG text for:', text);
        return svgText;
    });

    // Create SVG data URL to avoid CORS issues
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvgData);
    console.log('Clean SVG data URL created');

    // Create image and load SVG
    const img = new Image();
    
    // Set up promise-based image loading
    const loadImage = new Promise((resolve, reject) => {
        img.onload = () => {
            console.log('Image loaded successfully');
            resolve();
        };
        
        img.onerror = (error) => {
            console.error('Image loading failed:', error);
            reject(new Error('Failed to load SVG as image'));
        };
        
        // Set timeout for image loading
        setTimeout(() => {
            reject(new Error('Image loading timeout'));
        }, 10000);
    });

    img.src = svgDataUrl;
    
    // Wait for image to load
    await loadImage;
    
    // Draw the image to canvas
    ctx.drawImage(img, 0, 0);
    console.log('Image drawn to canvas');

    // Get PNG data from Canvas and download
    const downloadPromise = new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to create PNG blob'));
                return;
            }
            
            console.log('PNG blob created, size:', blob.size);
            
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `logic-model-${new Date().toISOString().split('T')[0]}.png`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            
            console.log('PNG download initiated');
            resolve();
        }, 'image/png', 0.95);
    });
    
    await downloadPromise;
    
    if (window.showMessage) {
        window.showMessage('PNG画像をダウンロードしました。');
    }
    console.log('PNG export completed successfully');
}

function exportAsSVG(svgData) {
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `logic-model-${new Date().toISOString().split('T')[0]}.svg`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    console.log('SVG download completed');
}