// Frontend App Logic for Chá de Cozinha - Netlify (Serverless) and Local (Express)

document.addEventListener('DOMContentLoaded', () => {
    // Detecta automaticamente se está no Netlify ou local
    const isNetlify = window.location.hostname.includes('netlify.app') || window.location.pathname.startsWith('/.netlify/');
    
    // Define as URLs correspondentes
    const FETCH_URL = isNetlify ? '/.netlify/functions/api' : '/api/gifts';
    const CLAIM_URL = isNetlify ? '/.netlify/functions/api' : '/api/gifts/claim';

    // State
    let gifts = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedGift = null;
    
    // Admin state
    let adminMode = false;
    let adminPasswordCache = '';

    // DOM Elements
    const giftGrid = document.getElementById('gift-grid');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Modal Elements
    const confirmModal = document.getElementById('confirm-modal');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const modalGiftTitle = document.getElementById('modal-gift-title');
    const claimForm = document.getElementById('claim-form');
    const guestNameInput = document.getElementById('guest-name');
    
    // Success Overlay Elements
    const successOverlay = document.getElementById('success-overlay');
    const successMessage = document.getElementById('success-message');
    const successCloseBtn = document.getElementById('success-close-btn');

    // 1. Fetch Gifts from server
    async function fetchGifts() {
        try {
            const response = await fetch(FETCH_URL);
            if (!response.ok) throw new Error('Não foi possível carregar os presentes.');
            gifts = await response.json();
            renderGifts();
        } catch (error) {
            console.error('Error fetching gifts:', error);
            giftGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent); font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Erro ao carregar lista de presentes. Por favor, tente novamente mais tarde.</p>
                </div>
            `;
        }
    }

    // Helper: Verify if a gift is fully chosen
    function isFullyChosen(gift) {
        const limit = gift.limit || 1;
        return Array.isArray(gift.chosenBy) && gift.chosenBy.length >= limit;
    }

    // 2. Render Gifts Grid
    function renderGifts() {
        const filteredGifts = gifts.filter(gift => {
            const fullyChosen = isFullyChosen(gift);
            
            const matchesFilter = 
                activeFilter === 'all' || 
                (activeFilter === 'available' && !fullyChosen) || 
                (activeFilter === 'chosen' && fullyChosen);
                
            const matchesSearch = gift.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        // Clear Grid
        giftGrid.innerHTML = '';

        if (filteredGifts.length === 0) {
            giftGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-gift" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Nenhum presente encontrado para os filtros selecionados.</p>
                </div>
            `;
            return;
        }

        // Render each card
        filteredGifts.forEach(gift => {
            const chosenCount = Array.isArray(gift.chosenBy) ? gift.chosenBy.length : 0;
            const limit = gift.limit || 1;
            const fullyChosen = chosenCount >= limit;
            
            const card = document.createElement('div');
            card.className = `gift-card ${fullyChosen ? 'chosen' : 'available'}`;
            
            // Build visual badge text
            let badgeText = '';
            if (limit > 1) {
                badgeText = fullyChosen ? 
                    `<span class="gift-status-badge"><i class="fa-solid fa-heart-crack"></i> Indisponível (Escolhido por ${chosenCount} pessoas)</span>` : 
                    `<span class="gift-status-badge"><i class="fa-solid fa-circle-check"></i> Disponível (${chosenCount}/${limit} escolhidos)</span>`;
            } else {
                badgeText = fullyChosen ? 
                    `<span class="gift-status-badge"><i class="fa-solid fa-heart-crack"></i> Indisponível</span>` : 
                    `<span class="gift-status-badge"><i class="fa-solid fa-circle-check"></i> Disponível</span>`;
            }

            let cardContent = `
                <div class="gift-card-content">
                    <i class="fa-solid fa-heart gift-heart-bullet"></i>
                    <div style="flex: 1;">
                        <h3 class="gift-name">${gift.name}</h3>
                        ${badgeText}
                    </div>
                </div>
            `;

            // Display who chose it (if any)
            if (chosenCount > 0) {
                // Formatação dos nomes dos padrinhos com suporte a remoção em modo Admin
                const namesHtml = gift.chosenBy.map(name => {
                    if (adminMode) {
                        return `<span class="guest-name-pill">${escapeHTML(name)} <span class="admin-remove-btn" data-id="${gift.id}" data-name="${escapeHTML(name)}" style="color: var(--accent); cursor: pointer; font-weight: bold; margin-left: 4px; font-size: 1.1rem; display: inline-block; padding: 0 3px;" title="Remover convidado">&times;</span></span>`;
                    }
                    return `<span class="guest-name-pill">${escapeHTML(name)}</span>`;
                }).join(' e ');

                cardContent += `
                    <div class="chosen-by-label">
                        <i class="fa-solid fa-user-check"></i>
                        <span>Escolhido por <span class="chosen-by-name">${namesHtml}</span></span>
                    </div>
                `;
            }

            // Display Action Button
            if (fullyChosen) {
                cardContent += `
                    <button class="btn btn-disabled" disabled>Já Escolhido</button>
                `;
            } else {
                const buttonLabel = limit > 1 && chosenCount > 0 ? 'Escolher também' : 'Escolher Presente';
                cardContent += `
                    <button class="btn btn-primary claim-btn" data-id="${gift.id}">
                        <i class="fa-solid fa-circle-check"></i> ${buttonLabel}
                    </button>
                `;
            }

            card.innerHTML = cardContent;
            giftGrid.appendChild(card);
        });

        // Attach event listeners for Claiming
        const claimBtns = document.querySelectorAll('.claim-btn');
        claimBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const giftId = parseInt(e.currentTarget.getAttribute('data-id'));
                openClaimModal(giftId);
            });
        });

        // Attach event listeners for Admin Removal
        if (adminMode) {
            const removeBtns = document.querySelectorAll('.admin-remove-btn');
            removeBtns.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const giftId = parseInt(e.currentTarget.getAttribute('data-id'));
                    const guestName = e.currentTarget.getAttribute('data-name');
                    
                    if (confirm(`Deseja realmente desmarcar o nome de "${guestName}" deste presente?`)) {
                        await removeClaim(giftId, guestName);
                    }
                });
            });
        }
    }

    // Helper: Escape HTML
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 3. Search input handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderGifts();
    });

    // 4. Filter button handler
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeFilter = e.currentTarget.getAttribute('data-filter');
            renderGifts();
        });
    });

    // 5. Modal actions
    function openClaimModal(giftId) {
        selectedGift = gifts.find(g => g.id === giftId);
        if (!selectedGift) return;

        modalGiftTitle.textContent = selectedGift.name;
        guestNameInput.value = '';
        
        confirmModal.classList.add('active');
        confirmModal.setAttribute('aria-hidden', 'false');
        guestNameInput.focus();
        document.body.style.overflow = 'hidden';
    }

    function closeClaimModal() {
        confirmModal.classList.remove('active');
        confirmModal.setAttribute('aria-hidden', 'true');
        selectedGift = null;
        document.body.style.overflow = '';
    }

    modalCloseBtn.addEventListener('click', closeClaimModal);
    modalCancelBtn.addEventListener('click', closeClaimModal);
    
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            closeClaimModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && confirmModal.classList.contains('active')) {
            closeClaimModal();
        }
    });

    // 6. Submit Claim Form
    claimForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const guestName = guestNameInput.value.trim();
        if (!guestName || !selectedGift) return;

        const confirmBtn = document.getElementById('modal-confirm');
        const originalBtnText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirmando...';

        try {
            const response = await fetch(CLAIM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: selectedGift.id,
                    guestName: guestName
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao confirmar presente.');
            }

            // Success UI
            closeClaimModal();
            successMessage.innerHTML = `Você escolheu o presente <strong>${selectedGift.name}</strong> com sucesso!<br>Muito obrigado!`;
            successOverlay.classList.add('active');
            
            // Refresh list
            fetchGifts();

        } catch (error) {
            alert(error.message);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalBtnText;
        }
    });

    // 7. Request removal from server (Admin Mode)
    async function removeClaim(giftId, guestName) {
        try {
            const response = await fetch(CLAIM_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'release',
                    id: giftId,
                    guestName: guestName,
                    password: adminPasswordCache
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao remover escolha do presente.');
            }

            alert('Escolha removida com sucesso!');
            
            // Sync lists (either the returned list or trigger a full fetch)
            if (result.gifts) {
                gifts = result.gifts;
                renderGifts();
            } else {
                fetchGifts();
            }
        } catch (error) {
            alert(error.message);
        }
    }

    // 8. Success dialog close
    successCloseBtn.addEventListener('click', () => {
        successOverlay.classList.remove('active');
    });

    // 9. Hidden Admin trigger on title double-click
    const mainTitle = document.querySelector('.main-title');
    if (mainTitle) {
        mainTitle.style.userSelect = 'none';
        mainTitle.title = "Dê um duplo clique para gerenciar a lista";
        
        mainTitle.addEventListener('dblclick', () => {
            if (adminMode) {
                adminMode = false;
                adminPasswordCache = '';
                alert('Modo Administrador desativado!');
                renderGifts();
            } else {
                const pwd = prompt('Digite a senha de administrador para desmarcar presentes:');
                if (pwd === '1234') {
                    adminMode = true;
                    adminPasswordCache = pwd;
                    alert('Modo Administrador ATIVADO! Agora você pode clicar no "X" ao lado de qualquer nome para desmarcá-lo.');
                    renderGifts();
                } else if (pwd !== null) {
                    alert('Senha incorreta!');
                }
            }
        });
    }

    // Initialize app
    fetchGifts();
});
