/**
 * Système d'Évaluation des Enseignants - École Internationale Alkawthar
 * Version améliorée avec connexion directe MongoDB
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ===== CONFIGURATION ET ÉTAT =====
    const state = { 
        currentUser: null, 
        currentLang: 'fr',
        isOnline: navigator.onLine
    };
    
    // Helper pour les traductions
    const getTranslation = (key, langOverride = null) => {
        const lang = langOverride || state.currentLang;
        const translations = {
            ar: {
                class: 'الصف',
                subject: 'المادة',
                score: 'النتيجة',
                chooseTeacher: '--- اختر معلمًا ---'
            }
        };
        return (translations[lang] && translations[lang][key]) || key;
    };
    
    const pages = {
        login: document.getElementById('login-page'),
        coordinator: document.getElementById('coordinator-dashboard'),
        teacher: document.getElementById('teacher-dashboard')
    };
    
    let EVALUATIONS_DATABASE = [];
   const API_BASE = ''; // NOUVEAU

    // ===== GESTION MONGODB DIRECTE (SANS LOCALSTORAGE) =====
    const MongoDB = {
    async request(endpoint, options = {}) {
        try {
            // S'assurer que les requêtes API vont vers le bon endpoint Vercel
            // Ajouter /api si l'endpoint ne commence pas par /api
            const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
            const fetchUrl = fullEndpoint; 
            
            console.log(`FETCH ${options.method || 'GET'}: ${fetchUrl}`);
            
            const response = await fetch(fetchUrl, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    ...options
                });
                
                if (!response.ok) {
                    // Tenter de lire l'erreur JSON si elle existe
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch {
                        errorData = await response.text();
                    }
                    console.error('API Error Response:', errorData);
                    
                    const errorMessage = (typeof errorData === 'object' && errorData.message) 
                        ? errorData.message 
                        : (typeof errorData === 'string' && errorData.length < 200) 
                        ? errorData : response.statusText;
                    
                    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('❌ Erreur MongoDB:', error);
                throw error;
            }
        },

        async loadEvaluations(teacherName = null) {
            try {
                const endpoint = teacherName 
                    ? `/evaluations?teacherName=${encodeURIComponent(teacherName)}`
                    : '/evaluations';
                
                console.log('🔄 Chargement depuis MongoDB:', endpoint);
                const result = await this.request(endpoint);
                
                if (result.success && result.data) {
                    console.log('✅ Évaluations chargées depuis MongoDB:', result.data.length);
                    return result.data;
                }
                
                return [];
            } catch (error) {
                console.error('❌ ERREUR: Impossible de charger depuis MongoDB', error);
                // Afficher l'erreur dans la modale de connexion si l'utilisateur n'est pas encore connecté
                if (!state.currentUser) {
                    document.getElementById('login-error').textContent = state.currentLang === 'fr' 
                        ? `❌ Erreur: Impossible de se connecter à la base de données MongoDB. ${error.message}` 
                        : state.currentLang === 'ar' ? `❌ خطأ: تعذر الاتصال بقاعدة بيانات MongoDB. ${error.message}` : `❌ Error: Cannot connect to MongoDB database. ${error.message}`;
                } else {
                     alert(state.currentLang === 'fr' 
                        ? '❌ Erreur: Impossible de charger les évaluations depuis MongoDB. Vérifiez votre connexion.' 
                        : state.currentLang === 'ar' ? '❌ خطأ: تعذر تحميل التقييمات من MongoDB. تحقق من الاتصال.' : '❌ Error: Cannot load evaluations from MongoDB. Check your connection.');
                }
                return [];
            }
        },

        async saveEvaluation(evaluation) {
            try {
                console.log('💾 Sauvegarde directe dans MongoDB...', evaluation);
                const result = await this.request('/evaluations', {
                    method: 'POST',
                    body: JSON.stringify(evaluation)
                });
                
                if (result.success) {
                    console.log('✅ Évaluation sauvegardée en MongoDB avec succès');
                    return { success: true, source: 'mongodb', data: result.data };
                }
                
                throw new Error('Échec de la sauvegarde');
            } catch (error) {
                console.error('❌ ERREUR: Sauvegarde MongoDB échouée', error);
                alert(state.currentLang === 'fr' 
                    ? '❌ Erreur: Impossible de sauvegarder dans MongoDB. Vérifiez votre connexion.' 
                    : state.currentLang === 'ar' ? '❌ خطأ: تعذر الحفظ في MongoDB. تحقق من الاتصال.' : '❌ Error: Cannot save to MongoDB. Check your connection.');
                throw error;
            }
        },

        async deleteEvaluation(evaluationId) {
            try {
                console.log('🗑️ Suppression depuis MongoDB...', evaluationId);
                const result = await this.request(`/evaluations/${evaluationId}`, {
                    method: 'DELETE'
                });
                
                if (result.success) {
                    console.log('✅ Évaluation supprimée de MongoDB');
                    return { success: true };
                }
                
                throw new Error('Échec de la suppression');
            } catch (error) {
                console.error('❌ ERREUR: Suppression MongoDB échouée', error);
                alert(state.currentLang === 'fr' 
                    ? '❌ Erreur: Impossible de supprimer de MongoDB. Vérifiez votre connexion.' 
                    : state.currentLang === 'ar' ? '❌ خطأ: تعذر الحذف من MongoDB. تحقق من الاتصال.' : '❌ Error: Cannot delete from MongoDB. Check your connection.');
                throw error;
            }
        }
    };

    // Surveiller la connectivité
    window.addEventListener('online', () => {
        state.isOnline = true;
        console.log('🌐 Connexion rétablie');
    });
    
    window.addEventListener('offline', () => {
        state.isOnline = false;
        console.log('📴 Mode hors ligne');
    });

    // ===== GESTION DES LANGUES =====
    const setLanguage = (lang) => {
        state.currentLang = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        document.querySelectorAll('[data-lang-en], [data-lang-fr], [data-lang-ar]').forEach(el => {
            const text = el.dataset[lang === 'fr' ? 'langFr' : (lang === 'ar' ? 'langAr' : 'langEn')] || '';
            const icon = el.querySelector('i');
            if (icon) {
                let span = el.querySelector('span');
                if (!span) {
                    span = document.createElement('span');
                    el.appendChild(span);
                }
                span.textContent = ` ${text}`;
            } else {
                el.textContent = text;
            }
        });
        
        document.querySelectorAll('[placeholder-fr], [placeholder-en], [placeholder-ar]').forEach(el => {
            el.placeholder = el.getAttribute(lang === 'fr' ? 'placeholder-fr' : (lang === 'ar' ? 'placeholder-ar' : 'placeholder-en'));
        });
        
        document.getElementById('lang-en').classList.toggle('active', lang === 'en');
        document.getElementById('lang-fr').classList.toggle('active', lang === 'fr');
        document.getElementById('lang-ar').classList.toggle('active', lang === 'ar');
    };

    const changeAndRerenderLanguage = (lang) => {
        setLanguage(lang);
        if (state.currentUser) {
            const renderer = state.currentUser.role === 'coordinator' ? renderCoordinatorUI : renderTeacherUI;
            renderer();
        } else {
             // S'assurer que le message d'erreur de connexion est mis à jour
            const loginError = document.getElementById('login-error');
            if (loginError.textContent.includes('MongoDB')) {
                // Tenter de relire l'erreur pour la traduire si c'est une erreur MongoDB
                // Nous allons ignorer la traduction pour l'erreur MongoDB pour conserver les détails de l'erreur HTTP si elle a été capturée
                // Sinon, mettre à jour le message "identifiants invalides"
            } else if (loginError.textContent) {
                loginError.textContent = lang === 'fr' ? 'Identifiants invalides.' : 'Invalid credentials.';
            }
        }
    };

    // ===== NAVIGATION =====
    const showPage = (pageName) => {
        Object.values(pages).forEach(page => page.classList.remove('active'));
        pages[pageName].classList.add('active');
    };

    // ===== BASE DE DONNÉES UTILISATEURS =====
    const USERS_DATABASE = [
        { username: 'Mohamed', password: 'Mohamed@86', role: 'coordinator', assignedTeachers: ['Morched', 'Kamel', 'Abas', 'Zine', 'Youssef', 'Oumarou', 'Tonga', 'Sylvano', 'Sami', 'Mohamed Ali'] },
        { username: 'Zohra', password: 'Zohra@40', role: 'coordinator', assignedTeachers: ['Aichetou', 'Inas', 'Anwar', 'Souha', 'Amal', 'Shanouja', 'Hiba', 'Samira'] },
        { username: 'Rasha', password: 'Rasha@26', role: 'coordinator', assignedTeachers: ['Amal', 'Rouba', 'Rayan', 'Nesrine', 'Fatima', 'Romana', 'Nour'] },
        { username: 'روعة', password: 'روعة2025', role: 'coordinator', assignedTeachers: ['نداء اللقماني', 'نسيم الرمثي'] },
        { username: 'عماد', password: 'عماد2025', role: 'coordinator', assignedTeachers: ['ماجد', 'سعيد', 'جابر'] },
        ...['Morched', 'Kamel', 'Abas', 'Zine', 'Youssef', 'Oumarou', 'Tonga', 'Sylvano', 'Sami', 'Mohamed Ali', 'Aichetou', 'Inas', 'Anwar', 'Souha', 'Amal', 'Shanouja', 'Jana', 'Samira', 'Rouba', 'Rayan', 'Nesrine', 'Fatima', 'Romana', 'Nour', 'نداء اللقماني', 'نسيم الرمثي', 'ماجد', 'سعيد', 'جابر'].map(name => ({ username: name, password: name, role: 'teacher' }))
    ];

    // ===== ÉVÉNEMENTS UI =====
    document.getElementById('lang-en').addEventListener('click', () => changeAndRerenderLanguage('en'));
    document.getElementById('lang-fr').addEventListener('click', () => changeAndRerenderLanguage('fr'));
    document.getElementById('lang-ar').addEventListener('click', () => changeAndRerenderLanguage('ar'));
    
    document.getElementById('toggle-password').addEventListener('click', function() {
        const input = document.getElementById('password');
        const icon = this.querySelector('i');
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // ===== CONNEXION =====
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const user = USERS_DATABASE.find(u => u.username === username && u.password === password);
        
        document.getElementById('login-error').textContent = ''; // Clear previous error
        
        if (user) {
            if (document.getElementById('remember-me').checked) {
                localStorage.setItem('teacherEvalCredentials', JSON.stringify({ username, password }));
            } else {
                localStorage.removeItem('teacherEvalCredentials');
            }
            
            state.currentUser = user;
            user.role === 'coordinator' ? renderCoordinatorUI() : renderTeacherUI();
            showPage(user.role === 'coordinator' ? 'coordinator' : 'teacher');
        } else {
            document.getElementById('login-error').textContent = 
                state.currentLang === 'fr' ? 'Identifiants invalides.' : state.currentLang === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.';
        }
    });

    // ===== DÉCONNEXION =====
    const logout = () => { 
        state.currentUser = null; 
        showPage('login'); 
        document.getElementById('login-error').textContent = '';
        document.getElementById('teacher-select').value = '';
        document.getElementById('evaluation-form-container').innerHTML = '';
        document.getElementById('previous-evaluations-container').innerHTML = '';
    };
    
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('logout-btn-teacher').addEventListener('click', logout);

    // ===== SÉLECTION ENSEIGNANT =====
    document.getElementById('teacher-select').addEventListener('change', async (e) => {
        const teacherName = e.target.value;
        document.getElementById('evaluation-form-container').innerHTML = '';
        document.getElementById('previous-evaluations-container').innerHTML = '';
        
        if (teacherName) {
            // Charger les évaluations depuis MongoDB
            await renderPreviousEvaluations(teacherName);
            renderEvaluationForm(teacherName);
        }
    });

    // ===== MODAL =====
    const modal = document.getElementById('details-modal');
    modal.querySelector('#close-modal-btn').addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => { 
        if (e.target === modal) modal.style.display = 'none'; 
    });

    // ===== INTERFACE COORDINATEUR =====
    const renderCoordinatorUI = () => {
        document.getElementById('coordinator-welcome').textContent = 
            `${state.currentLang === 'fr' ? 'Bienvenue' : state.currentLang === 'ar' ? 'مرحبا' : 'Welcome'}, ${state.currentUser.username}`;
        
        const teacherSelect = document.getElementById('teacher-select');
        const currentSelection = teacherSelect.value;
        teacherSelect.innerHTML = `<option value="">${state.currentLang === 'fr' ? '--- Choisir un enseignant ---' : state.currentLang === 'ar' ? '--- اختر معلمًا ---' : '--- Choose a teacher ---'}</option>`;
        
        state.currentUser.assignedTeachers.sort().forEach(teacher => {
            teacherSelect.innerHTML += `<option value="${teacher}" ${currentSelection === teacher ? 'selected' : ''}>${teacher}</option>`;
        });
        
        const teacherName = teacherSelect.value;
        if (teacherName) {
            renderPreviousEvaluations(teacherName);
            renderEvaluationForm(teacherName);
        }
        
        setLanguage(state.currentLang);
    };

    // ===== ÉVALUATIONS PRÉCÉDENTES (AMÉLIORÉ) =====
    const renderPreviousEvaluations = async (teacherName) => {
        const container = document.getElementById('previous-evaluations-container');
        container.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Chargement des évaluations...</p></div>';
        
        try {
            // Charger depuis MongoDB
            const evals = await MongoDB.loadEvaluations(teacherName);
            EVALUATIONS_DATABASE = evals; // Mettre à jour le cache local
            
            const sortedEvals = evals
                .filter(e => e.teacherName === teacherName)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (sortedEvals.length === 0) {
                container.innerHTML = `<div class="card no-evaluations">
                    <h3 data-lang-en="No previous evaluations for this teacher." 
                        data-lang-fr="Aucune évaluation précédente pour cet enseignant."></h3>
                </div>`;
                setLanguage(state.currentLang);
                return;
            }
            
            container.innerHTML = `
                <div class="card">
                    <h3>
                        <i class="fas fa-history"></i>
                        <span data-lang-en="Previous Evaluations (${sortedEvals.length})" 
                              data-lang-fr="Évaluations Précédentes (${sortedEvals.length})"></span>
                    </h3>
                    <ul class="previous-eval-list">
                        ${sortedEvals.map(ev => `
                            <li data-id="${ev.id}">
                                <div class="eval-info">
                                    <i class="fas fa-calendar-alt"></i> 
                                    ${new Date(ev.date).toLocaleDateString(state.currentLang === 'fr' ? 'fr-FR' : state.currentLang === 'ar' ? 'ar-EG' : 'en-US')}
                                    <span class="eval-class">
                                        <b>${state.currentLang === 'fr' ? 'Classe' : state.currentLang === 'ar' ? 'الصف' : 'Class'}:</b> ${ev.class || 'N/A'}
                                    </span>
                                    <span class="eval-subject">
                                        <b>${state.currentLang === 'fr' ? 'Matière' : state.currentLang === 'ar' ? 'المادة' : 'Subject'}:</b> ${ev.subject || 'N/A'}
                                    </span>
                                    <span><b>Score:</b> ${ev.grandTotal}/100</span>
                                </div>
                                <div class="eval-actions">
                                    <button class="view-btn" title="${state.currentLang === 'fr' ? 'Voir les détails' : state.currentLang === 'ar' ? 'عرض التفاصيل' : 'View details'}">
                                        <i class="fas fa-eye"></i> 
                                        <span data-lang-en="View" data-lang-fr="Voir" data-lang-ar="عرض"></span>
                                    </button>
                                    <button class="word-btn" title="${state.currentLang === 'fr' ? 'Télécharger Word' : state.currentLang === 'ar' ? 'تحميل Word' : 'Download Word'}">
                                        <i class="fas fa-file-word"></i> 
                                        <span data-lang-en="Word" data-lang-fr="Word" data-lang-ar="Word"></span>
                                    </button>
                                    <button class="delete-btn" title="${state.currentLang === 'fr' ? 'Supprimer' : state.currentLang === 'ar' ? 'حذف' : 'Delete'}">
                                        <i class="fas fa-trash"></i> 
                                        <span data-lang-en="Delete" data-lang-fr="Supprimer" data-lang-ar="حذف"></span>
                                    </button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
            
            setLanguage(state.currentLang);
        } catch (error) {
            console.error('Erreur chargement évaluations:', error);
            container.innerHTML = `
                <div class="card">
                    <p style="color: var(--danger-color); text-align: center;">
                        ⚠️ ${state.currentLang === 'fr' ? 'Erreur de chargement des évaluations' : state.currentLang === 'ar' ? 'خطأ في تحميل التقييمات' : 'Error loading evaluations'}
                    </p>
                </div>
            `;
        }
    };

    // Gestion des clics sur les évaluations précédentes
    document.getElementById('previous-evaluations-container').addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        
        const evalId = li.dataset.id;
        
        if (e.target.closest('.view-btn')) {
            window.showEvaluationDetails(evalId);
        }
        if (e.target.closest('.word-btn')) {
            window.generateTeacherWordReport(evalId);
        }
        if (e.target.closest('.delete-btn')) {
            window.deleteEvaluation(evalId);
        }
    });

    // ===== FORMULAIRE D'ÉVALUATION =====
    const renderEvaluationForm = (teacherName) => {
        const visitNumber = EVALUATIONS_DATABASE.filter(e => e.teacherName === teacherName).length + 1;
        const criteria = getCriteria();
        let criteriaIndex = 0;
        
        // Classes spécifiques selon le coordinateur
        let classOptions = '';
        if (state.currentUser.username === 'روعة') {
            classOptions = ['KG1', 'KG2', 'KG3'].map(c => `<option value="${c}">${c}</option>`).join('');
        } else if (state.currentUser.username === 'عماد') {
            classOptions = ['G7', 'G8', 'G9', 'G10', 'G11', 'G12'].map(c => `<option value="${c}">${c}</option>`).join('');
        } else {
            classOptions = null; // Champ texte libre pour les autres
        }
        
        let formHTML = `
            <form id="eval-form" class="card">
                <h3>
                    <i class="fas fa-clipboard-list"></i> 
                    <span data-lang-en="New Evaluation for ${teacherName}" 
                          data-lang-fr="Nouvelle Évaluation pour ${teacherName}"></span>
                </h3>
                <div class="evaluation-metadata">
                    <div class="metadata-row">
                        <div class="metadata-item">
                            <label data-lang-en="Visit Number" data-lang-fr="Numéro de Visite" data-lang-ar="رقم الزيارة"></label>
                            <input type="text" value="${visitNumber}" readonly>
                        </div>
                        <div class="metadata-item">
                            <label data-lang-en="Visit Date" data-lang-fr="Date de Visite" data-lang-ar="تاريخ الزيارة"></label>
                            <input type="date" name="visitDate" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="metadata-item">
                            <label data-lang-en="Session (1-8)" data-lang-fr="Séance (1-8)" data-lang-ar="الحصة (1-8)"></label>
                            <select name="sessionNumber" required>
                                ${Array.from({length: 8}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                            </select>
                        </div>
                        <div class="metadata-item">
                            <label data-lang-en="Class" data-lang-fr="Classe" data-lang-ar="القسم"></label>
                            <input type="text" name="class" required placeholder-fr="Ex: 6ème A" placeholder-en="Ex: Grade 6A" placeholder-ar="مثال: الصف السادس أ">
                        </div>
                        <div class="metadata-item">
                            <label data-lang-en="Subject" data-lang-fr="Matière" data-lang-ar="المادة"></label>
                            <input type="text" name="subject" required placeholder-fr="Ex: Mathématiques" placeholder-en="Ex: Mathematics" placeholder-ar="مثال: الرياضيات">
                        </div>
                    </div>
                </div>
        `;
        
        for (const category in criteria) {
            const cat = criteria[category];
            formHTML += `
                <fieldset class="criteria-section">
                    <legend class="category-header">
                        <span class="category-title" 
                              data-lang-en="${cat.title_en}" 
                              data-lang-fr="${cat.title_fr}"
                              data-lang-ar="${cat.title_ar}"></span>
                        <span class="category-points">
                            <span class="current-score">0</span>/${cat.maxPoints} pts
                        </span>
                    </legend>
                    <div class="criteria-table">
                        <div class="table-header">
                            <div class="criteria-col" data-lang-en="Criteria" data-lang-fr="Critères" data-lang-ar="المعايير"></div>
                            <div class="rating-col" data-lang-en="Rating" data-lang-fr="Éval." data-lang-ar="التقييم"></div>
                            <div class="score-col">Score</div>
                        </div>
            `;
            
            cat.items.forEach(item => {
                const detailText = item[`detail_${state.currentLang}`] || '';
                formHTML += `
                    <div class="criteria-row">
                        <div class="criteria-text-wrapper">
                            <div class="criteria-text" 
                                 data-lang-en="${item.text_en}" 
                                 data-lang-fr="${item.text_fr}"
                                 data-lang-ar="${item.text_ar}"></div>
                            ${detailText ? `<div class="criteria-detail" title="${detailText}">${detailText}</div>` : ''}
                        </div>
                        <div class="rating-controls">
                            ${[1, 2, 3, 4, 5].map(n => `
                                <input type="radio" 
                                       id="c${criteriaIndex}-${n}" 
                                       name="crit${criteriaIndex}" 
                                       value="${n}" 
                                       data-max-points="${item.points}" 
                                       required>
                                <label for="c${criteriaIndex}-${n}">${n}</label>
                            `).join('')}
                        </div>
                        <div class="calculated-score" data-criteria="${criteriaIndex}">0</div>
                    </div>
                `;
                criteriaIndex++;
            });
            
            formHTML += `
                    </div>
                </fieldset>
            `;
        }
        
        formHTML += `
                <div class="evaluation-summary">
                    <div class="total-score-section">
                        <div class="score-display">
                            <span class="total-number" id="grand-total-display">0</span>
                            <span class="total-max">/100</span>
                        </div>
                        <div id="performance-level"></div>
                    </div>
                </div>
                
                <div class="comments-section">
                    <div class="comment-group">
                        <label for="s">
                            <i class="fas fa-star"></i> 
                            <span data-lang-en="Strengths" data-lang-fr="Forces" data-lang-ar="نقاط القوة"></span>
                        </label>
                        <textarea id="s" name="strengths" required rows="4"></textarea>
                    </div>
                    <div class="comment-group">
                        <label for="i">
                            <i class="fas fa-arrow-up"></i> 
                            <span data-lang-en="Improvements" data-lang-fr="Améliorations" data-lang-ar="التحسينات"></span>
                        </label>
                        <textarea id="i" name="toImprove" required rows="4"></textarea>
                    </div>
                    <div class="comment-group">
                        <label for="r">
                            <i class="fas fa-lightbulb"></i> 
                            <span data-lang-en="Recommendations" data-lang-fr="Recommandations" data-lang-ar="التوصيات"></span>
                        </label>
                        <textarea id="r" name="recommendations" required rows="4"></textarea>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="submit-btn">
                        <i class="fas fa-save"></i> 
                        <span data-lang-en="Save Evaluation" data-lang-fr="Enregistrer" data-lang-ar="حفظ التقييم"></span>
                    </button>
                </div>
            </form>
        `;
        
        const container = document.getElementById('evaluation-form-container');
        container.innerHTML = formHTML;
        setLanguage(state.currentLang);

        const form = container.querySelector('#eval-form');
        form.addEventListener('change', () => calculateScores(form));
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (form.querySelectorAll('input[type="radio"]:checked').length < criteriaIndex) {
                alert(state.currentLang === 'fr' ? 'Veuillez noter tous les critères.' : state.currentLang === 'ar' ? 'يرجى تقييم جميع المعايير.' : 'Please rate all criteria.');
                return;
            }
            
            const formData = new FormData(e.target);
            const scores = calculateScores(form);
            const rawCriteria = Array.from(form.querySelectorAll('input[type="radio"]:checked'))
                .reduce((acc, r) => ({
                    ...acc, 
                    [r.name]: { rating: parseInt(r.value) }
                }), {});
            
            const newEvaluation = {
                id: Date.now().toString(),
                teacherName,
                coordinatorName: state.currentUser.username,
                class: formData.get('class'),
                subject: formData.get('subject'),
                sessionNumber: formData.get('sessionNumber'),
                visitDate: formData.get('visitDate'),
                criteriaDetails: getCriteria(),
                grandTotal: scores.grandTotal,
                comments: {
                    strengths: formData.get('strengths'),
                    toImprove: formData.get('toImprove'),
                    recommendations: formData.get('recommendations')
                },
                date: new Date().toISOString(),
                rawCriteria
            };
            
            try {
                const result = await MongoDB.saveEvaluation(newEvaluation);
                EVALUATIONS_DATABASE.push(newEvaluation);
                
                let message = state.currentLang === 'fr' 
                    ? 'Évaluation enregistrée avec succès!' 
                    : state.currentLang === 'ar' ? 'تم حفظ التقييم بنجاح!' : 'Evaluation saved successfully!';
                
                if (result.source === 'mongodb') {
                    message += state.currentLang === 'fr' 
                        ? ' (Sauvegardé en base de données)' 
                        : state.currentLang === 'ar' ? ' (محفوظ في قاعدة البيانات)' : ' (Saved to database)';
                } else {
                    message += state.currentLang === 'fr' 
                        ? ' (Sauvegarde locale)' 
                        : state.currentLang === 'ar' ? ' (حفظ محلي)' : ' (Local save)';
                }
                
                alert(message);
                
                // Réinitialiser l'interface
                document.getElementById('teacher-select').value = '';
                container.innerHTML = '';
                document.getElementById('previous-evaluations-container').innerHTML = '';
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                alert(state.currentLang === 'fr' 
                    ? 'Erreur lors de la sauvegarde' 
                    : state.currentLang === 'ar' ? 'خطأ في الحفظ' : 'Save error');
            }
        });
    };

    // ===== CALCUL DES SCORES =====
    const calculateScores = (form) => {
        let grandTotal = 0;
        const radios = form.querySelectorAll('input[type="radio"]:checked');
        
        radios.forEach(r => {
            const score = Math.round((parseInt(r.value) / 5) * parseInt(r.dataset.maxPoints));
            grandTotal += score;
            
            // Mettre à jour le score individuel
            const scoreDisplay = form.querySelector(`.calculated-score[data-criteria="${r.name.replace('crit', '')}"]`);
            if (scoreDisplay) {
                scoreDisplay.textContent = score;
            }
        });
        
        // Mettre à jour les scores par catégorie
        form.querySelectorAll('.criteria-section').forEach(section => {
            const categoryRadios = section.querySelectorAll('input[type="radio"]:checked');
            let categoryScore = 0;
            
            categoryRadios.forEach(r => {
                categoryScore += Math.round((parseInt(r.value) / 5) * parseInt(r.dataset.maxPoints));
            });
            
            const scoreSpan = section.querySelector('.current-score');
            if (scoreSpan) {
                scoreSpan.textContent = categoryScore;
            }
        });
        
        const perf = getPerformanceLevel(grandTotal);
        form.querySelector('#grand-total-display').textContent = grandTotal;
        
        const levelEl = form.querySelector('#performance-level');
        levelEl.textContent = perf[`label_${state.currentLang}`];
        levelEl.className = `performance-level ${perf.class}`;
        
        return { grandTotal };
    };

    // ===== INTERFACE ENSEIGNANT (AMÉLIORÉ) =====
    const renderTeacherUI = async () => {
        document.getElementById('teacher-welcome').textContent = 
            `${state.currentLang === 'fr' ? 'Bienvenue' : state.currentLang === 'ar' ? 'مرحبا' : 'Welcome'}, ${state.currentUser.username}`;
        
        const container = document.getElementById('evaluation-reports');
        container.innerHTML = '<div class="card"><p style="text-align:center;">⏳ Chargement des évaluations...</p></div>';
        
        try {
            // Charger depuis MongoDB
            const evals = await MongoDB.loadEvaluations(state.currentUser.username);
            EVALUATIONS_DATABASE = evals;
            
            const sortedEvals = evals
                .filter(ev => ev.teacherName === state.currentUser.username)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (sortedEvals.length === 0) {
                container.innerHTML = `
                    <div class="card no-evaluations">
                        <h3 data-lang-en="No evaluations available" 
                            data-lang-fr="Aucune évaluation disponible"></h3>
                    </div>
                `;
                setLanguage(state.currentLang);
                return;
            }
            
            container.innerHTML = sortedEvals.map((ev, index) => {
                const perf = getPerformanceLevel(ev.grandTotal);
                return `
                    <div class="evaluation-card ${index === 0 ? 'latest' : ''}">
                        <div class="card-header">
                            <div class="eval-date">
                                <i class="fas fa-calendar-check"></i> 
                                ${new Date(ev.date).toLocaleDateString(state.currentLang === 'fr' ? 'fr-FR' : state.currentLang === 'ar' ? 'ar-EG' : 'en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                                ${index === 0 ? `
                                    <span class="latest-badge">
                                        ${state.currentLang === 'fr' ? 'RÉCENT' : state.currentLang === 'ar' ? 'الأحدث' : 'LATEST'}
                                    </span>
                                ` : ''}
                            </div>
                            <div class="eval-meta">
                                <span><b>${state.currentLang === 'fr' ? 'Évaluateur' : state.currentLang === 'ar' ? 'المقيّم' : 'Evaluator'}:</b> ${ev.coordinatorName}</span>
                                <span><b>${state.currentLang === 'fr' ? 'Classe' : state.currentLang === 'ar' ? 'الصف' : 'Class'}:</b> ${ev.class || 'N/A'}</span>
                                <span><b>${state.currentLang === 'fr' ? 'Matière' : state.currentLang === 'ar' ? 'المادة' : 'Subject'}:</b> ${ev.subject || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="overall-progress">
                                <div class="progress-bar-container">
                                    <div class="progress-bar-fill" 
                                         style="width: ${ev.grandTotal}%; background-color: ${perf.color};"></div>
                                </div>
                                <div class="score-summary">
                                    <span class="score-number">${ev.grandTotal}</span>
                                    <span class="score-max">/100</span>
                                    <span class="performance-badge" style="background-color: ${perf.color}">
                                        ${perf[`label_${state.currentLang}`]}
                                    </span>
                                </div>
                            </div>
                            <div class="card-actions">
                                <button class="details-btn" onclick="window.showEvaluationDetails('${ev.id}')">
                                    <i class="fas fa-search-plus"></i> 
                                    <span data-lang-en="View Details" data-lang-fr="Voir Détails"></span>
                                </button>
                                <button class="word-btn" onclick="window.generateTeacherWordReport('${ev.id}')">
                                    <i class="fas fa-file-word"></i> 
                                    <span data-lang-en="Download Word" data-lang-fr="Télécharger Word"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            setLanguage(state.currentLang);
        } catch (error) {
            console.error('Erreur chargement évaluations:', error);
            container.innerHTML = `
                <div class="card">
                    <p style="color: var(--danger-color); text-align: center;">
                        ⚠️ ${state.currentLang === 'fr' ? 'Erreur de chargement' : state.currentLang === 'ar' ? 'خطأ في التحميل' : 'Loading error'}
                    </p>
                </div>
            `;
        }
    };

    // ===== MODAL DÉTAILS =====
    window.showEvaluationDetails = (evalId) => {
        const ev = EVALUATIONS_DATABASE.find(e => e.id === evalId);
        if (!ev) return;
        
        let critIndex = 0;
        
        document.getElementById('modal-body-content').innerHTML = `
            <div class="detail-grid">
                <div><strong>${state.currentLang === 'fr' ? 'Date' : state.currentLang === 'ar' ? 'التاريخ' : 'Date'}:</strong> 
                    ${new Date(ev.date).toLocaleDateString(state.currentLang === 'fr' ? 'fr-FR' : state.currentLang === 'ar' ? 'ar-EG' : 'en-US')}</div>
                <div><strong>${state.currentLang === 'fr' ? 'Classe' : state.currentLang === 'ar' ? 'الصف' : 'Class'}:</strong> ${ev.class || 'N/A'}</div>
                <div><strong>${state.currentLang === 'fr' ? 'Matière' : state.currentLang === 'ar' ? 'المادة' : 'Subject'}:</strong> ${ev.subject || 'N/A'}</div>
                <div><strong>${state.currentLang === 'fr' ? 'Séance N°' : state.currentLang === 'ar' ? 'رقم الحصة' : 'Session #'}:</strong> ${ev.sessionNumber || 'N/A'}</div>
                <div><strong>${state.currentLang === 'fr' ? 'Évaluateur' : state.currentLang === 'ar' ? 'المقيّم' : 'Evaluator'}:</strong> ${ev.coordinatorName}</div>
                <div><strong>Score Total:</strong> <span style="font-size: 1.2em; color: var(--primary-color);">${ev.grandTotal}/100</span></div>
            </div>
            
            <h4>${state.currentLang === 'fr' ? 'Tableau des Scores' : state.currentLang === 'ar' ? 'جدول النتائج' : 'Scores Table'}</h4>
            <div class="criteria-table-details">
                ${Object.values(ev.criteriaDetails).map(cat => `
                    <div class="category-detail-header">${cat[`title_${state.currentLang}`]}</div>
                    ${cat.items.map(item => {
                        const rating = (ev.rawCriteria && ev.rawCriteria[`crit${critIndex}`]) 
                            ? ev.rawCriteria[`crit${critIndex}`].rating 
                            : 'N/A';
                        const score = (rating !== 'N/A') 
                            ? Math.round((rating / 5) * item.points) 
                            : 'N/A';
                        critIndex++;
                        return `
                            <div class="criteria-detail-row">
                                <div class="criteria-detail-text">${item[`text_${state.currentLang}`]}</div>
                                <div class="criteria-detail-rating">
                                    ${state.currentLang === 'fr' ? 'Note' : state.currentLang === 'ar' ? 'التقييم' : 'Rating'}: <strong>${rating}/5</strong>
                                </div>
                                <div class="criteria-detail-score">Score: <strong>${score}/${item.points}</strong></div>
                            </div>
                        `;
                    }).join('')}
                `).join('')}
            </div>
            
            <h4>${state.currentLang === 'fr' ? 'Commentaires' : state.currentLang === 'ar' ? 'التعليقات' : 'Comments'}</h4>
            <div class="comments-details">
                <div class="comment-item">
                    <h6><i class="fas fa-star"></i> ${state.currentLang === 'fr' ? 'Forces' : state.currentLang === 'ar' ? 'نقاط القوة' : 'Strengths'}</h6>
                    <p style="white-space: pre-wrap;">${ev.comments.strengths || ''}</p>
                </div>
                <div class="comment-item">
                    <h6><i class="fas fa-arrow-up"></i> ${state.currentLang === 'fr' ? 'Améliorations' : state.currentLang === 'ar' ? 'التحسينات' : 'Improvements'}</h6>
                    <p style="white-space: pre-wrap;">${ev.comments.toImprove || ''}</p>
                </div>
                <div class="comment-item">
                    <h6><i class="fas fa-lightbulb"></i> ${state.currentLang === 'fr' ? 'Recommandations' : state.currentLang === 'ar' ? 'التوصيات' : 'Recommendations'}</h6>
                    <p style="white-space: pre-wrap;">${ev.comments.recommendations || ''}</p>
                </div>
            </div>
        `;
        
        document.getElementById('details-modal').style.display = 'flex';
    };

    // ===== GÉNÉRATION WORD PROFESSIONNELLE AMÉLIORÉE (LOGIQUE CORRIGÉE) =====
    window.generateTeacherWordReport = async (evalId) => {
        if (typeof docx === 'undefined' || typeof saveAs === 'undefined') {
            console.error("Erreur: Les librairies docx ou FileSaver ne sont pas chargées.");
            alert("Erreur: Une librairie nécessaire n'a pu être chargée. Veuillez rafraîchir la page.");
            return;
        }

        try {
            const data = EVALUATIONS_DATABASE.find(ev => ev.id === evalId);
            if (!data) throw new Error("Évaluation non trouvée !");
            
            const { 
                Document, Packer, Paragraph, TextRun, HeadingLevel, Table, 
                TableCell, TableRow, WidthType, AlignmentType, BorderStyle 
            } = docx;
            
            // Détecter si le coordinateur est arabe
            const isArabicCoordinator = ['روعة', 'عماد'].includes(data.coordinatorName);
            const docLang = isArabicCoordinator ? 'ar' : 'fr';
            
            const perf = getPerformanceLevel(data.grandTotal);
            
            // Créer un tableau de synthèse par catégorie (CORRECTION LOGIQUE)
            const categorySummary = [];
            let critIndexSummary = 0; // Index global pour accéder à data.rawCriteria (crit0, crit1, ...)
            
            Object.values(data.criteriaDetails || {}).forEach(cat => {
                let categoryTotal = 0;
                
                cat.items.forEach(item => { // Itérer sur chaque item de la catégorie
                    const rating = (data.rawCriteria && data.rawCriteria[`crit${critIndexSummary}`]) 
                        ? data.rawCriteria[`crit${critIndexSummary}`].rating 
                        : 0;
                    
                    // Calculer le score de l'item
                    const score = Math.round((rating / 5) * item.points); 
                    
                    categoryTotal += score;
                    critIndexSummary++; // Incrémenter l'index global pour le critère suivant
                });
                
                categorySummary.push({
                    title: cat[`title_${docLang}`],
                    total: categoryTotal,
                    max: cat.maxPoints
                });
            });
            // FIN DE LA CORRECTION LOGIQUE
            
            let critIndex = 0;
            const tableRows = Object.values(data.criteriaDetails || {}).flatMap(cat => {
                const categoryRows = [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: cat[`title_${docLang}`] || '',
                                                bold: true,
                                                color: 'FFFFFF',
                                                size: 24
                                            })
                                        ],
                                        spacing: { before: 150, after: 150 }
                                    })
                                ],
                                columnSpan: 4,
                                shading: { fill: "005A9E" },
                                margins: { top: 150, bottom: 150, left: 150, right: 150 }
                            })
                        ]
                    })
                ];
                
                const itemRows = (cat.items || []).map(item => {
                    const rating = (data.rawCriteria && data.rawCriteria[`crit${critIndex}`]) 
                        ? data.rawCriteria[`crit${critIndex}`].rating 
                        : 0;
                    const score = Math.round((rating / 5) * item.points);
                    critIndex++;
                    
                    return new TableRow({
                        children: [
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: item[`text_${docLang}`] || ''
                                            })
                                        ],
                                        spacing: { before: 80, after: 80 }
                                    })
                                ],
                                width: { size: 50, type: WidthType.PERCENTAGE },
                                margins: { top: 80, bottom: 80, left: 80, right: 80 }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `${item.points}`
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 80, after: 80 }
                                    })
                                ],
                                width: { size: 15, type: WidthType.PERCENTAGE },
                                shading: { fill: "ECF0F1" },
                                margins: { top: 80, bottom: 80, left: 80, right: 80 }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: rating.toString(),
                                                bold: true
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 80, after: 80 }
                                    })
                                ],
                                width: { size: 15, type: WidthType.PERCENTAGE },
                                shading: { fill: "E8F8F5" },
                                margins: { top: 80, bottom: 80, left: 80, right: 80 }
                            }),
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `${score}`,
                                                bold: true
                                            })
                                        ],
                                        alignment: AlignmentType.CENTER,
                                        spacing: { before: 80, after: 80 }
                                    })
                                ],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                                shading: { fill: score >= item.points * 0.8 ? "D5F4E6" : "FADBD8" },
                                margins: { top: 80, bottom: 80, left: 80, right: 80 }
                            })
                        ]
                    });
                });
                
                return categoryRows.concat(itemRows);
            });
            
            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
                        }
                    },
                    children: [
                        // En-tête principal avec logo symbolique
                        new Paragraph({
                            children: [
                                new TextRun({ text: "🎓" })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docLang === 'ar' ? "المدرسة الدولية الكوثر" : "ÉCOLE INTERNATIONALE ALKAWTHAR",
                                    bold: true,
                                    size: 32
                                })
                            ],
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docLang === 'ar' ? "تقرير التقييم التربوي" : "RAPPORT D'ÉVALUATION PÉDAGOGIQUE",
                                    bold: true,
                                    size: 28
                                })
                            ],
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 },
                            shading: { fill: "F0F4F8" },
                            bidirectional: docLang === 'ar'
                        }),
                        
                        // Ligne de séparation
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "━".repeat(60),
                                    color: "005A9E"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 }
                        }),
                        
                        // Informations générales
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: docLang === 'ar' ? 'المعلم : ' : 'Enseignant : ', 
                                    bold: true, 
                                    size: 24 
                                }),
                                new TextRun({ 
                                    text: data.teacherName || '', 
                                    size: 24 
                                })
                            ],
                            spacing: { after: 200 },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: docLang === 'ar' ? 'المقيّم : ' : 'Évaluateur : ', 
                                    bold: true, 
                                    size: 24 
                                }),
                                new TextRun({ 
                                    text: data.coordinatorName || '', 
                                    size: 24 
                                })
                            ],
                            spacing: { after: 200 },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: docLang === 'ar' ? 'تاريخ الزيارة : ' : 'Date de visite : ', 
                                    bold: true, 
                                    size: 24 
                                }),
                                new TextRun({ 
                                    text: data.visitDate || '', 
                                    size: 24 
                                })
                            ],
                            spacing: { after: 200 },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: docLang === 'ar' ? 'الصف : ' : 'Classe : ', 
                                    bold: true, 
                                    size: 24 
                                }),
                                new TextRun({ 
                                    text: data.class || 'N/A', 
                                    size: 24 
                                })
                            ],
                            spacing: { after: 200 },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: docLang === 'ar' ? 'المادة : ' : 'Matière : ', 
                                    bold: true, 
                                    size: 24 
                                }),
                                new TextRun({ 
                                    text: data.subject || 'N/A', 
                                    size: 24 
                                })
                            ],
                            spacing: { after: 200 },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: docLang === 'ar' ? 'رقم الحصة : ' : 'Séance N° : ', 
                                    bold: true, 
                                    size: 24 
                                }),
                                new TextRun({ 
                                    text: data.sessionNumber || 'N/A', 
                                    size: 24 
                                })
                            ],
                            spacing: { after: 400 },
                            bidirectional: docLang === 'ar'
                        }),
                        
                        // Score total avec badge de performance (amélioration visuelle)
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "━".repeat(60),
                                    color: "005A9E"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `📊 ${docLang === 'ar' ? 'النتيجة الإجمالية : ' : 'SCORE TOTAL : '}`,
                                    bold: true,
                                    size: 36
                                }),
                                new TextRun({
                                    text: `${data.grandTotal || 0}/100`,
                                    bold: true,
                                    size: 48,
                                    color: perf.color.replace('#', '')
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 },
                            border: {
                                top: { style: BorderStyle.DOUBLE, size: 6, color: perf.color.replace('#', '') },
                                bottom: { style: BorderStyle.DOUBLE, size: 6, color: perf.color.replace('#', '') }
                            },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `✨ ${docLang === 'ar' ? 'المستوى : ' : 'Niveau : '}`,
                                    bold: true,
                                    size: 28
                                }),
                                new TextRun({
                                    text: perf[`label_${docLang}`].toUpperCase(),
                                    bold: true,
                                    size: 32,
                                    color: perf.color.replace('#', '')
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 },
                            shading: { fill: "F8F9FA" },
                            bidirectional: docLang === 'ar'
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "━".repeat(60),
                                    color: "005A9E"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        
                        // Tableau récapitulatif par catégorie
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docLang === 'ar' ? '📈 ملخص حسب الفئة' : '📈 RÉSUMÉ PAR CATÉGORIE',
                                    bold: true,
                                    size: 28
                                })
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 300, after: 200 },
                            bidirectional: docLang === 'ar'
                        }),
                        
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 2, color: "005A9E" },
                                bottom: { style: BorderStyle.SINGLE, size: 2, color: "005A9E" },
                                left: { style: BorderStyle.SINGLE, size: 2, color: "005A9E" },
                                right: { style: BorderStyle.SINGLE, size: 2, color: "005A9E" },
                                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({
                                                        text: docLang === 'ar' ? 'الفئة' : 'Catégorie',
                                                        bold: true,
                                                        color: 'FFFFFF'
                                                    })
                                                ],
                                                alignment: AlignmentType.CENTER,
                                                bidirectional: docLang === 'ar'
                                            })],
                                            shading: { fill: "005A9E" }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({
                                                        text: docLang === 'ar' ? 'النتيجة المحصلة' : 'Score Obtenu',
                                                        bold: true,
                                                        color: 'FFFFFF'
                                                    })
                                                ],
                                                alignment: AlignmentType.CENTER,
                                                bidirectional: docLang === 'ar'
                                            })],
                                            shading: { fill: "005A9E" }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({
                                                        text: docLang === 'ar' ? 'الحد الأقصى' : 'Maximum',
                                                        bold: true,
                                                        color: 'FFFFFF'
                                                    })
                                                ],
                                                alignment: AlignmentType.CENTER,
                                                bidirectional: docLang === 'ar'
                                            })],
                                            shading: { fill: "005A9E" }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({
                                                        text: '%',
                                                        bold: true,
                                                        color: 'FFFFFF'
                                                    })
                                                ],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            shading: { fill: "005A9E" }
                                        })
                                    ]
                                }),
                                ...categorySummary.map(cat => new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({ text: cat.title, bold: true })
                                                ]
                                            })],
                                            shading: { fill: "F8F9FA" }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({
                                                        text: cat.total.toString(),
                                                        bold: true
                                                    })
                                                ],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            shading: { fill: cat.total >= cat.max * 0.8 ? "D5F4E6" : "FEF5E7" }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({ text: cat.max.toString() })
                                                ],
                                                alignment: AlignmentType.CENTER 
                                            })]
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ 
                                                children: [
                                                    new TextRun({
                                                        text: Math.round((cat.total / cat.max) * 100) + '%',
                                                        bold: true
                                                    })
                                                ],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            shading: { fill: cat.total >= cat.max * 0.8 ? "D5F4E6" : "FEF5E7" }
                                        })
                                    ]
                                }))
                            ]
                        }),
                        
                        new Paragraph({ text: '', spacing: { after: 400 } }),
                        
                        // Tableau détaillé (design amélioré)
                        new Paragraph({
                            text: state.currentLang === 'fr' ? '📋 TABLEAU DÉTAILLÉ DES NOTES' : '📋 DETAILED SCORES TABLE',
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 }
                        }),
                        
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.DOUBLE, size: 3, color: "005A9E" },
                                bottom: { style: BorderStyle.DOUBLE, size: 3, color: "005A9E" },
                                left: { style: BorderStyle.SINGLE, size: 2, color: "005A9E" },
                                right: { style: BorderStyle.SINGLE, size: 2, color: "005A9E" },
                                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "BDC3C7" },
                                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "BDC3C7" }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({
                                                        text: docLang === 'ar' ? 'معيار التقييم' : 'Critère d\'Évaluation',
                                                        bold: true,
                                                        color: 'FFFFFF',
                                                        size: 22
                                                    })],
                                                    alignment: AlignmentType.CENTER
                                                })
                                            ],
                                            shading: { fill: "005A9E" },
                                            margins: { top: 120, bottom: 120, left: 120, right: 120 }
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({
                                                        text: docLang === 'ar' ? 'الأقصى' : 'Max',
                                                        bold: true,
                                                        color: 'FFFFFF',
                                                        size: 22
                                                    })],
                                                    alignment: AlignmentType.CENTER
                                                })
                                            ],
                                            shading: { fill: "005A9E" },
                                            margins: { top: 120, bottom: 120, left: 120, right: 120 }
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({
                                                        text: docLang === 'ar' ? 'التقييم' : 'Note',
                                                        bold: true,
                                                        color: 'FFFFFF',
                                                        size: 22
                                                    })],
                                                    alignment: AlignmentType.CENTER
                                                })
                                            ],
                                            shading: { fill: "005A9E" },
                                            margins: { top: 120, bottom: 120, left: 120, right: 120 }
                                        }),
                                        new TableCell({
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({
                                                        text: docLang === 'ar' ? 'النتيجة' : 'Score',
                                                        bold: true,
                                                        color: 'FFFFFF',
                                                        size: 22
                                                    })],
                                                    alignment: AlignmentType.CENTER
                                                })
                                            ],
                                            shading: { fill: "005A9E" },
                                            margins: { top: 120, bottom: 120, left: 120, right: 120 }
                                        })
                                    ],
                                    tableHeader: true
                                }),
                                ...tableRows
                            ]
                        }),
                        
                        new Paragraph({ text: '', spacing: { after: 400 } }),
                        
                        // Commentaires (design amélioré avec icônes et boîtes colorées + sauts de ligne conservés)
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docLang === 'ar' ? '⭐ نقاط القوة الملاحظة' : '⭐ FORCES OBSERVÉES',
                                    bold: true,
                                    size: 28
                                })
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 500, after: 200 },
                            shading: { fill: "D5F4E6" },
                            bidirectional: docLang === 'ar'
                        }),
                        ...(data.comments.strengths || (docLang === 'ar' ? 'لا تعليقات' : 'Aucun commentaire'))
                            .split('\n')
                            .map(line => new Paragraph({
                                text: line || ' ',
                                spacing: { after: 100, before: 50 },
                                indent: { left: 720 },
                                border: {
                                    left: { style: BorderStyle.SINGLE, size: 6, color: "27AE60" }
                                },
                                bidirectional: docLang === 'ar'
                            })),
                        
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docLang === 'ar' ? '📈 محاور التحسين' : '📈 AXES D\'AMÉLIORATION',
                                    bold: true,
                                    size: 28
                                })
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 },
                            shading: { fill: "FEF5E7" },
                            bidirectional: docLang === 'ar'
                        }),
                        ...(data.comments.toImprove || (docLang === 'ar' ? 'لا تعليقات' : 'Aucun commentaire'))
                            .split('\n')
                            .map(line => new Paragraph({
                                text: line || ' ',
                                spacing: { after: 100, before: 50 },
                                indent: { left: 720 },
                                border: {
                                    left: { style: BorderStyle.SINGLE, size: 6, color: "F39C12" }
                                },
                                bidirectional: docLang === 'ar'
                            })),
                        
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docLang === 'ar' ? '💡 التوصيات' : '💡 RECOMMANDATIONS',
                                    bold: true,
                                    size: 28
                                })
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 },
                            shading: { fill: "EBF5FB" },
                            bidirectional: docLang === 'ar'
                        }),
                        ...(data.comments.recommendations || (docLang === 'ar' ? 'لا تعليقات' : 'Aucun commentaire'))
                            .split('\n')
                            .map(line => new Paragraph({
                                text: line || ' ',
                                spacing: { after: 100, before: 50 },
                                indent: { left: 720 },
                                border: {
                                    left: { style: BorderStyle.SINGLE, size: 6, color: "3498DB" }
                                },
                                bidirectional: docLang === 'ar'
                            })),
                        
                        // Pied de page professionnel
                        new Paragraph({ text: '', spacing: { before: 600 } }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "━".repeat(60),
                                    color: "005A9E"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '📅 ',
                                    size: 20
                                }),
                                new TextRun({
                                    text: docLang === 'ar' 
                                        ? `تم إنشاء المستند في ${new Date().toLocaleDateString('ar-EG', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}` 
                                        : `Document généré le ${new Date().toLocaleDateString('fr-FR', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}`,
                                    italics: true,
                                    size: 20
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: docLang === 'ar' 
                                        ? '© المدرسة الدولية الكوثر - نظام تقييم المعلمين' 
                                        : '© École Internationale Alkawthar - Système d\'Évaluation des Enseignants',
                                    italics: true,
                                    size: 18,
                                    color: "7F8C8D"
                                })
                            ],
                            alignment: AlignmentType.CENTER
                        })
                    ]
                }]
            });
            
            const blob = await Packer.toBlob(doc);
            const fileName = `Evaluation_${data.teacherName.replace(/\s+/g, '_')}_${data.visitDate || new Date().toISOString().split('T')[0]}.docx`;
            saveAs(blob, fileName);
            
            console.log('✅ Document Word professionnel généré avec succès:', fileName);
            
            // Notification visuelle
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; 
                background: #27AE60; color: white; padding: 1rem 2rem; 
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 9999; animation: slideIn 0.5s ease;
            `;
            notification.innerHTML = `<i class="fas fa-check-circle"></i> ${state.currentLang === 'fr' ? 'Document téléchargé avec succès!' : state.currentLang === 'ar' ? 'تم تحميل الملف بنجاح!' : 'Document downloaded successfully!'}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.5s ease';
                setTimeout(() => notification.remove(), 500);
            }, 3000);

        } catch (error) {
            console.error("Erreur détaillée de la génération Word:", error);
            alert(state.currentLang === 'fr' 
                ? "Erreur: Impossible de générer le document Word. Consultez la console." 
                : state.currentLang === 'ar' ? "خطأ: تعذر إنشاء ملف Word. تحقق من وحدة التحكم." : "Error: Could not generate Word document. Check console.");
        }
    };

    // ===== SUPPRESSION =====
    window.deleteEvaluation = async (evalId) => {
        const confirmText = state.currentLang === 'fr' 
            ? 'Êtes-vous sûr de vouloir supprimer cette évaluation ?' 
            : state.currentLang === 'ar' ? 'هل أنت متأكد من حذف هذا التقييم؟' : 'Are you sure you want to delete this evaluation?';
        
        if (confirm(confirmText)) {
            const index = EVALUATIONS_DATABASE.findIndex(ev => ev.id === evalId);
            
            if (index > -1) {
                const teacherName = EVALUATIONS_DATABASE[index].teacherName;
                
                try {
                    await MongoDB.deleteEvaluation(evalId);
                    EVALUATIONS_DATABASE.splice(index, 1);
                    
                    // Rafraîchir l'affichage
                    await renderPreviousEvaluations(teacherName);
                    
                    // Si le formulaire était affiché pour cet enseignant, le ré-afficher pour mettre à jour le numéro de visite
                    const currentTeacher = document.getElementById('teacher-select').value;
                    if (currentTeacher === teacherName) {
                        renderEvaluationForm(teacherName);
                    }
                    
                    alert(state.currentLang === 'fr' 
                        ? 'Évaluation supprimée avec succès' 
                        : state.currentLang === 'ar' ? 'تم حذف التقييم بنجاح' : 'Evaluation deleted successfully');
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    alert(state.currentLang === 'fr' 
                        ? 'Erreur lors de la suppression' 
                        : state.currentLang === 'ar' ? 'خطأ في الحذف' : 'Delete error');
                }
            }
        }
    };

    // ===== NIVEAUX DE PERFORMANCE =====
    const getPerformanceLevel = (score) => {
        if (score >= 90) return { 
            label_en: "Excellent", 
            label_fr: "Excellent",
            label_ar: "ممتاز", 
            class: "excellent", 
            color: "#27ae60" 
        };
        if (score >= 80) return { 
            label_en: "Very Good", 
            label_fr: "Très Bien",
            label_ar: "جيد جدًا", 
            class: "very-good", 
            color: "#2ecc71" 
        };
        if (score >= 70) return { 
            label_en: "Good", 
            label_fr: "Bien",
            label_ar: "جيد", 
            class: "good", 
            color: "#f39c12" 
        };
        if (score >= 60) return { 
            label_en: "Satisfactory", 
            label_fr: "Satisfaisant",
            label_ar: "مقبول", 
            class: "satisfactory", 
            color: "#e67e22" 
        };
        return { 
            label_en: "Needs Improvement", 
            label_fr: "À améliorer",
            label_ar: "يحتاج تحسين", 
            class: "needs-improvement", 
            color: "#e74c3c" 
        };
    };

    // ===== CRITÈRES D'ÉVALUATION AVEC DÉTAILS =====
    const getCriteria = () => ({
        preparation: {
            title_en: "PREPARATION AND PLANNING",
            title_fr: "PRÉPARATION ET PLANIFICATION",
            title_ar: "التحضير والتخطيط",
            maxPoints: 25,
            items: [
                { 
                    text_en: "Lesson plans with clear objectives", 
                    text_fr: "Plans de cours avec objectifs clairs", 
                    text_ar: "خطط دروس بأهداف واضحة",
                    detail_fr: "📋 L'enseignant prépare des plans de cours détaillés avec des objectifs d'apprentissage mesurables et alignés au curriculum",
                    detail_ar: "📋 يُعد المعلم خطط دروس مفصلة مع أهداف تعليمية قابلة للقياس ومتوافقة مع المنهج",
                    points: 5 
                },
                { 
                    text_en: "Knowledge of curriculum", 
                    text_fr: "Connaissance du curriculum", 
                    text_ar: "معرفة المنهج الدراسي",
                    detail_fr: "📚 Maîtrise approfondie du programme scolaire, des compétences requises et de la progression pédagogique",
                    detail_ar: "📚 إتقان شامل للبرنامج الدراسي والمهارات المطلوبة والتقدم التربوي",
                    points: 5 
                },
                { 
                    text_en: "Appropriate materials", 
                    text_fr: "Matériaux appropriés", 
                    text_ar: "مواد مناسبة",
                    detail_fr: "🎯 Sélection et utilisation de ressources pédagogiques adaptées au niveau et aux besoins des élèves",
                    detail_ar: "🎯 اختيار واستخدام موارد تعليمية مناسبة لمستوى واحتياجات الطلاب",
                    points: 5 
                },
                { 
                    text_en: "Differentiated instruction", 
                    text_fr: "Enseignement différencié", 
                    text_ar: "تعليم متمايز",
                    detail_fr: "🌟 Adaptation des méthodes d'enseignement pour répondre aux différents styles et rythmes d'apprentissage",
                    detail_ar: "🌟 تكييف أساليب التدريس لتلبية أنماط وإيقاعات التعلم المختلفة",
                    points: 5 
                },
                { 
                    text_en: "Assessments aligned with objectives", 
                    text_fr: "Évaluations alignées aux objectifs", 
                    text_ar: "تقييمات متوافقة مع الأهداف",
                    detail_fr: "✅ Conception d'évaluations qui mesurent efficacement l'atteinte des objectifs d'apprentissage",
                    detail_ar: "✅ تصميم تقييمات تقيس بفعالية تحقيق أهداف التعلم",
                    points: 5 
                }
            ]
        },
        activities: {
            title_en: "TEACHING ACTIVITIES",
            title_fr: "ACTIVITÉS D'ENSEIGNEMENT",
            title_ar: "أنشطة التدريس",
            maxPoints: 25,
            items: [
                { 
                    text_en: "Clear and structured lessons", 
                    text_fr: "Leçons claires et structurées", 
                    text_ar: "دروس واضحة ومنظمة",
                    detail_fr: "🎓 Présentation logique et cohérente du contenu avec une introduction, un développement et une conclusion claire",
                    detail_ar: "🎓 عرض منطقي ومتماسك للمحتوى مع مقدمة وتطوير وخاتمة واضحة",
                    points: 5 
                },
                { 
                    text_en: "Varied teaching strategies", 
                    text_fr: "Stratégies d'enseignement variées", 
                    text_ar: "استراتيجيات تدريس متنوعة",
                    detail_fr: "🔄 Utilisation de méthodes pédagogiques diversifiées (travail de groupe, individuel, interactif, etc.)",
                    detail_ar: "🔄 استخدام أساليب تعليمية متنوعة (عمل جماعي، فردي، تفاعلي، إلخ)",
                    points: 5 
                },
                { 
                    text_en: "Appropriate use of technology", 
                    text_fr: "Usage approprié de la technologie", 
                    text_ar: "استخدام مناسب للتكنولوجيا",
                    detail_fr: "💻 Intégration efficace des outils technologiques pour enrichir l'apprentissage et maintenir l'engagement",
                    detail_ar: "💻 دمج فعال للأدوات التكنولوجية لإثراء التعلم والحفاظ على التفاعل",
                    points: 5 
                },
                { 
                    text_en: "Promotes critical thinking", 
                    text_fr: "Favorise la pensée critique", 
                    text_ar: "تعزيز التفكير النقدي",
                    detail_fr: "🧠 Encouragement des élèves à analyser, questionner et développer leur raisonnement",
                    detail_ar: "🧠 تشجيع الطلاب على التحليل والتساؤل وتطوير تفكيرهم",
                    points: 5 
                },
                { 
                    text_en: "Timely and constructive feedback", 
                    text_fr: "Feedback opportun et constructif", 
                    text_ar: "تغذية راجعة بناءة وفي الوقت المناسب",
                    detail_fr: "💬 Retour régulier et spécifique qui aide les élèves à progresser et à comprendre leurs erreurs",
                    detail_ar: "💬 تعليقات منتظمة ومحددة تساعد الطلاب على التقدم وفهم أخطائهم",
                    points: 5 
                }
            ]
        },
        classroomControl: {
            title_en: "CLASSROOM MANAGEMENT",
            title_fr: "GESTION DE CLASSE",
            title_ar: "إدارة الصف",
            maxPoints: 25,
            items: [
                { 
                    text_en: "Conducive learning environment", 
                    text_fr: "Environnement d'apprentissage propice", 
                    text_ar: "بيئة تعليمية ملائمة",
                    detail_fr: "🏫 Création d'un climat de classe positif, sécurisant et stimulant pour l'apprentissage",
                    detail_ar: "🏫 خلق مناخ صفي إيجابي وآمن ومحفز للتعلم",
                    points: 5 
                },
                { 
                    text_en: "Effective student behavior management", 
                    text_fr: "Gestion efficace du comportement", 
                    text_ar: "إدارة فعالة لسلوك الطلاب",
                    detail_fr: "👥 Mise en place et application cohérente de règles claires pour maintenir la discipline",
                    detail_ar: "👥 وضع وتطبيق متسق لقواعد واضحة للحفاظ على النظام",
                    points: 5 
                },
                { 
                    text_en: "Efficient use of time", 
                    text_fr: "Utilisation efficace du temps", 
                    text_ar: "استخدام فعال للوقت",
                    detail_fr: "⏰ Optimisation du temps de classe avec transitions fluides et minimisation des temps morts",
                    detail_ar: "⏰ تحسين وقت الحصة مع انتقالات سلسة وتقليل الأوقات الضائعة",
                    points: 5 
                },
                { 
                    text_en: "Handles disruptions professionally", 
                    text_fr: "Gère les perturbations professionnellement", 
                    text_ar: "التعامل مع الاضطرابات بشكل احترافي",
                    detail_fr: "🛡️ Réponse calme et appropriée aux comportements perturbateurs sans interrompre l'apprentissage",
                    detail_ar: "🛡️ استجابة هادئة ومناسبة للسلوكيات المزعجة دون مقاطعة التعلم",
                    points: 5 
                },
                { 
                    text_en: "Organized classroom and resources", 
                    text_fr: "Classe et ressources organisées", 
                    text_ar: "صف وموارد منظمة",
                    detail_fr: "📦 Organisation physique de l'espace et des matériels facilitant l'accès et l'apprentissage",
                    detail_ar: "📦 تنظيم مادي للمساحة والمواد يسهل الوصول والتعلم",
                    points: 5 
                }
            ]
        },
        personalCriteria: {
            title_en: "PROFESSIONAL QUALITIES",
            title_fr: "QUALITÉS PROFESSIONNELLES",
            title_ar: "الصفات المهنية",
            maxPoints: 25,
            items: [
                { 
                    text_en: "Professional appearance", 
                    text_fr: "Apparence professionnelle", 
                    text_ar: "مظهر مهني",
                    detail_fr: "👔 Tenue vestimentaire appropriée et présentation soignée reflétant le professionnalisme",
                    detail_ar: "👔 لباس مناسب ومظهر أنيق يعكس الاحترافية",
                    points: 5 
                },
                { 
                    text_en: "Punctual and reliable", 
                    text_fr: "Ponctuel et fiable", 
                    text_ar: "ملتزم بالمواعيد وموثوق",
                    detail_fr: "⏱️ Respect des horaires, présence régulière et fiabilité dans l'exécution des responsabilités",
                    detail_ar: "⏱️ احترام المواعيد والحضور المنتظم والموثوقية في تنفيذ المسؤوليات",
                    points: 5 
                },
                { 
                    text_en: "Positive relationships with students", 
                    text_fr: "Relations positives avec les élèves", 
                    text_ar: "علاقات إيجابية مع الطلاب",
                    detail_fr: "❤️ Communication respectueuse, empathique et encourageante favorisant la confiance mutuelle",
                    detail_ar: "❤️ تواصل محترم ومتعاطف ومشجع يعزز الثقة المتبادلة",
                    points: 5 
                },
                { 
                    text_en: "Collaboration with colleagues", 
                    text_fr: "Collaboration avec les collègues", 
                    text_ar: "التعاون مع الزملاء",
                    detail_fr: "🤝 Travail d'équipe efficace, partage d'idées et soutien mutuel avec les collègues",
                    detail_ar: "🤝 عمل جماعي فعال ومشاركة الأفكار والدعم المتبادل مع الزملاء",
                    points: 5 
                },
                { 
                    text_en: "Commitment to growth", 
                    text_fr: "Engagement envers le développement", 
                    text_ar: "الالتزام بالتطوير المهني",
                    detail_fr: "📈 Recherche active d'opportunités de formation et d'amélioration continue des pratiques",
                    detail_ar: "📈 البحث النشط عن فرص التدريب والتحسين المستمر للممارسات",
                    points: 5 
                }
            ]
        }
    });

    // ===== INITIALISATION (LOGIQUE AJUSTÉE) =====
    const init = async () => {
        setLanguage('fr');
        let autoLoggedIn = false;
        
        // 1. Tenter l'auto-connexion
        const savedCreds = localStorage.getItem('teacherEvalCredentials');
        if (savedCreds) {
            const { username, password } = JSON.parse(savedCreds);
            document.getElementById('username').value = username;
            document.getElementById('password').value = password;
            document.getElementById('remember-me').checked = true;
            
            const user = USERS_DATABASE.find(u => u.username === username && u.password === password);
            if (user) {
                state.currentUser = user;
                user.role === 'coordinator' ? renderCoordinatorUI() : renderTeacherUI();
                showPage(user.role === 'coordinator' ? 'coordinator' : 'teacher');
                autoLoggedIn = true;
            } else {
                 // Si les identifiants sont locaux mais ne correspondent plus (changement de mot de passe), les supprimer
                localStorage.removeItem('teacherEvalCredentials');
            }
        }
        
        // 2. Charger les évaluations initiales (seulement si connecté ou pour le check API général)
        // Ceci va également remplir le champ d'erreur de connexion si le 404 persiste.
        try {
            EVALUATIONS_DATABASE = await MongoDB.loadEvaluations(state.currentUser ? state.currentUser.username : null);
            console.log('✅ Système initialisé:', EVALUATIONS_DATABASE.length, 'évaluations chargées');
            if (document.getElementById('login-error').textContent.includes('MongoDB')) {
                 document.getElementById('login-error').textContent = ''; // Clear error if load was successful
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement initial:', error);
            // L'erreur est déjà propagée à login-error par MongoDB.loadEvaluations
        }
        
        // Assurez-vous d'être sur la page de connexion si l'auto-connexion a échoué
        if (!state.currentUser) {
            showPage('login');
        }
    };

    init();
});
