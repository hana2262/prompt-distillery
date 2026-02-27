const { createApp, ref, computed, onMounted, watch } = Vue;

const App = {
  setup() {
    const windowMode = ref('standard');
    const clipboardEnabled = ref(false);
    const inputText = ref('');
    const templates = ref([]);
    const searchQuery = ref('');
    const currentView = ref('main');
    const showSettings = ref(false);
    const showAddBackground = ref(false);
    const newBackgroundUrl = ref('');
    const settings = ref({
      theme: {
        accentColor: '#10B981',
        backgroundImage: '',
        glassEffect: true,
        customBackgrounds: []
      }
    });
    const recentTemplates = ref([]);
    const toast = ref({ show: false, message: '', type: 'success' });
    const clipboardText = ref('');
    const clipboardAlert = ref({ show: false, text: '' });
    const promptInput = ref('');
    const templateName = ref('');
    const templateCategory = ref('');

    const viewHistory = ref([]);
    const selectedCategory = ref('全部');
    const categories = computed(() => {
      const cats = new Set(['全部']);
      templates.value.forEach(t => {
        t.category?.forEach(c => cats.add(c));
      });
      return Array.from(cats);
    });

    const filteredTemplates = computed(() => {
      let result = templates.value;

      // 分类筛选
      if (selectedCategory.value && selectedCategory.value !== '全部') {
        result = result.filter(t => t.category?.includes(selectedCategory.value));
      }

      // 搜索筛选
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(t =>
          t.name.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query) ||
          t.category?.some(c => c.toLowerCase().includes(query)) ||
          t.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }

      // 置顶排序 + 最近使用排序
      return result.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const aTime = a.usage?.lastUsed || a.createdAt;
        const bTime = b.usage?.lastUsed || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
    });

    const accentColorStyle = computed(() => {
      const style = {
        '--accent': settings.value.theme.accentColor,
        backgroundColor: 'rgba(17, 24, 39, 0.85)'
      };
      if (settings.value.theme.backgroundImage) {
        style.backgroundImage = `url(${settings.value.theme.backgroundImage})`;
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
      }
      if (settings.value.theme.glassEffect) {
        style.backdropFilter = 'blur(12px)';
      }
      return style;
    });

    async function loadSettings() {
      try {
        // 从 localStorage 加载主题设置（包含自定义背景）
        const storedTheme = localStorage.getItem('themeSettings');
        if (storedTheme) {
          const themeData = JSON.parse(storedTheme);
          settings.value.theme = { ...settings.value.theme, ...themeData };
        }
        // 从 Electron API 加载其他设置（不覆盖 theme）
        const loaded = await window.electronAPI.settings.get();
        if (loaded) {
          // 只更新非 theme 的设置
          const { theme, ...otherSettings } = loaded;
          settings.value = { ...settings.value, ...otherSettings };
          clipboardEnabled.value = loaded.clipboardMonitor?.enabled || false;
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }

    async function saveSettings() {
      try {
        // 保存主题设置到 localStorage
        localStorage.setItem('themeSettings', JSON.stringify(settings.value.theme));
        // 保存其他设置到 Electron
        await window.electronAPI.settings.set(settings.value);
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }

    function handleBackgroundDrop(event) {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target.result;
          // 保存到文件系统
          const result = await window.electronAPI.background.save(base64Data);
          if (result) {
            settings.value.theme.backgroundImage = result;
            saveSettings();
            showToast('背景图片已保存');
          } else {
            showToast('保存失败', 'error');
          }
        };
        reader.readAsDataURL(file);
      }
    }

    function handleBackgroundDragOver(event) {
      event.preventDefault();
    }

    function selectLocalImage() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const base64Data = ev.target.result;
            // 保存到文件系统
            const result = await window.electronAPI.background.save(base64Data);
            if (result) {
              settings.value.theme.backgroundImage = result;
              saveSettings();
              showToast('背景图片已保存');
            } else {
              showToast('保存失败', 'error');
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }

    // 添加自定义背景 URL
    function addCustomBackground() {
      const url = newBackgroundUrl.value.trim();
      if (!url) {
        showToast('请输入图片地址', 'error');
        return;
      }
      // 验证 URL 格式
      try {
        new URL(url);
      } catch {
        showToast('请输入有效的 URL', 'error');
        return;
      }

      // 添加到自定义背景列表
      if (!settings.value.theme.customBackgrounds) {
        settings.value.theme.customBackgrounds = [];
      }
      settings.value.theme.customBackgrounds.push(url);
      settings.value.theme.backgroundImage = url;
      saveSettings();
      showToast('背景图片已添加');
      newBackgroundUrl.value = '';
      showAddBackground.value = false;
    }

    // 删除自定义背景
    function deleteCustomBackground(url) {
      if (!settings.value.theme.customBackgrounds) return;
      const index = settings.value.theme.customBackgrounds.indexOf(url);
      if (index > -1) {
        settings.value.theme.customBackgrounds.splice(index, 1);
        // 如果删除的是当前选中的背景，清空选择
        if (settings.value.theme.backgroundImage === url) {
          settings.value.theme.backgroundImage = '';
        }
        saveSettings();
        showToast('已删除');
      }
    }

    async function loadTemplates() {
      try {
        const stored = localStorage.getItem('templates');
        templates.value = stored ? JSON.parse(stored) : getDefaultTemplates();
        saveTemplates();
      } catch {
        templates.value = getDefaultTemplates();
      }
    }

    function saveTemplates() {
      try {
        localStorage.setItem('templates', JSON.stringify(templates.value));
      } catch (err) {
        console.error('Failed to save templates:', err);
      }
    }

    // 草稿自动保存
    function saveDraft() {
      if (currentView.value === 'input' && (promptInput.value || templateName.value)) {
        try {
          localStorage.setItem('draft', JSON.stringify({
            promptInput: promptInput.value,
            templateName: templateName.value,
            templateCategory: templateCategory.value,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Failed to save draft:', err);
        }
      }
    }

    function loadDraft() {
      try {
        const draft = localStorage.getItem('draft');
        if (draft) {
          const data = JSON.parse(draft);
          if (data.promptInput || data.templateName) {
            promptInput.value = data.promptInput || '';
            templateName.value = data.templateName || '';
            templateCategory.value = data.templateCategory || '';
            return true;
          }
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
      return false;
    }

    function clearDraft() {
      try {
        localStorage.removeItem('draft');
      } catch (err) {
        console.error('Failed to clear draft:', err);
      }
    }

    function getDefaultTemplates() {
      return [
        {
          id: '1',
          name: '角色设定',
          content: '你是一个{{角色}}，拥有{{经验}}年的经验。你的专长是{{专长}}。请用{{风格}}的方式回答问题。',
          category: ['创作'],
          tags: ['角色', '设定'],
          variables: [
            { key: '角色', label: '角色名称', type: 'string', default: '助手' },
            { key: '经验', label: '经验年限', type: 'string', default: '5' },
            { key: '专长', label: '专长领域', type: 'string', default: '编程' },
            { key: '风格', label: '回答风格', type: 'string', default: '专业' }
          ],
          usage: { count: 0, lastUsed: null },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: '代码审查',
          content: '请审查以下代码，找出{{问题类型}}问题，并提供{{建议类型}}。\n\n```{{语言}}\n{{代码}}\n```',
          category: ['编程'],
          tags: ['代码', '审查'],
          variables: [
            { key: '问题类型', label: '问题类型', type: 'string', default: '潜在' },
            { key: '建议类型', label: '建议类型', type: 'string', default: '具体' },
            { key: '语言', label: '编程语言', type: 'string', default: 'javascript' },
            { key: '代码', label: '代码内容', type: 'textarea', default: '' }
          ],
          usage: { count: 0, lastUsed: null },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '3',
          name: '文章写作',
          content: '请帮我写一篇关于{{主题}}的文章，要求：\n- 字数：{{字数}}\n- 风格：{{风格}}\n- 受众：{{受众}}',
          category: ['创作'],
          tags: ['写作', '文章'],
          variables: [
            { key: '主题', label: '文章主题', type: 'string', default: '' },
            { key: '字数', label: '目标字数', type: 'string', default: '800' },
            { key: '风格', label: '写作风格', type: 'string', default: '正式' },
            { key: '受众', label: '目标受众', type: 'string', default: '普通读者' }
          ],
          usage: { count: 0, lastUsed: null },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }

    function showToast(message, type = 'success') {
      toast.value = { show: true, message, type };
      setTimeout(() => {
        toast.value.show = false;
      }, 3000);
    }

    async function handleCopy(text) {
      try {
        await window.electronAPI.clipboard.write(text);
        showToast('已复制到剪贴板');
        if (settings.value.copyAfterHide !== false) {
          setTimeout(() => {
            window.electronAPI.window.close();
          }, 500);
        }
      } catch (err) {
        showToast('复制失败', 'error');
      }
    }

    async function handlePaste() {
      try {
        const text = await window.electronAPI.clipboard.read();
        promptInput.value = text || '';
        navigateTo('input', { promptInput: text || '' });
      } catch (err) {
        console.error('Failed to paste:', err);
        navigateTo('input');
      }
    }

    function showPromptInput() {
      navigateTo('input', { promptInput: '', templateName: '', templateCategory: '' });
    }

    // 保留此函数以备后用
    function newPrompt() {
      navigateTo('input', { promptInput: '', templateName: '', templateCategory: '' });
    }

    function clearInput() {
      promptInput.value = '';
      templateName.value = '';
      templateCategory.value = '';
      clearDraft();
    }

    function saveToTemplate() {
      if (!promptInput.value.trim()) return;

      // 解析分类
      const categories = templateCategory.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
      const category = categories.length > 0 ? categories : ['未分类'];

      // 自动标签 (M4.3)
      const tags = autoTag(promptInput.value);

      const newTemplate = {
        id: Date.now().toString(),
        name: templateName.value.trim() || '新模板',
        content: promptInput.value.trim(),
        category,
        tags,
        variables: parseVariables(promptInput.value),
        usage: { count: 0, lastUsed: null },
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 查重检测 (M4.1)
      const similar = findSimilarTemplates(newTemplate, 0.5);

      templates.value.push(newTemplate);
      saveTemplates();

      // 清除草稿
      clearDraft();

      if (similar.length > 0) {
        showToast(`已保存，发现 ${similar.length} 个相似模板`);
      } else {
        showToast('已保存到模板库');
      }

      // 清空输入
      promptInput.value = '';
      templateName.value = '';
      templateCategory.value = '';
      currentView.value = 'main';
    }

    async function toggleClipboardMonitor() {
      try {
        if (clipboardEnabled.value) {
          await window.electronAPI.clipboard.stopMonitor();
          clipboardEnabled.value = false;
        } else {
          await window.electronAPI.clipboard.startMonitor();
          clipboardEnabled.value = true;
        }
      } catch (err) {
        console.error('Failed to toggle clipboard monitor:', err);
      }
    }

    function handleClipboardChanged(text) {
      clipboardAlert.value = { show: true, text: text.substring(0, 100) };
      promptInput.value = text;
      navigateTo('input', { promptInput: text });
      setTimeout(() => {
        clipboardAlert.value.show = false;
      }, 3000);
    }

    function selectTemplate(template) {
      navigateTo('fill', { template: template });
    }

    // 解析模板内容中的变量
    function parseVariables(content) {
      const regex = /\{\{([^}]+)\}\}/g;
      const vars = [];
      const seen = new Set();
      let match;
      while ((match = regex.exec(content)) !== null) {
        const key = match[1].trim();
        if (!seen.has(key)) {
          seen.add(key);
          vars.push({ key, label: key, type: 'string', default: '' });
        }
      }
      return vars;
    }

    // ========== M4 AI 分析功能 ==========

    // Jaccard 相似度算法 (查重)
    function getJaccardSimilarity(text1, text2) {
      const tokens1 = new Set(text1.toLowerCase().split(/\s+/).filter(t => t));
      const tokens2 = new Set(text2.toLowerCase().split(/\s+/).filter(t => t));
      const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
      const union = new Set([...tokens1, ...tokens2]);
      return union.size === 0 ? 0 : intersection.size / union.size;
    }

    // 查找相似模板
    function findSimilarTemplates(template, threshold = 0.5) {
      return templates.value
        .filter(t => t.id !== template.id)
        .map(t => ({
          template: t,
          similarity: getJaccardSimilarity(template.content, t.content)
        }))
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
    }

    // 自动标签关键词映射
    const autoTagKeywords = {
      '编程': ['代码', '程序', 'function', 'class', 'api', 'bug', 'debug', '算法', '开发'],
      '写作': ['文章', '写作', '文案', '内容', '编辑', '润色', '段落', '标题'],
      '翻译': ['翻译', '英文', '英语', '中文', '语言', 'convert', 'translate'],
      '问答': ['回答', '问题', '解释', '说明', '什么', '如何', '为什么'],
      '总结': ['总结', '摘要', '概括', '提炼', '核心', '要点', '归纳'],
      '头脑风暴': ['创意', '想法', '建议', '方案', ' brainstorm', '想法', '创新'],
      '数据分析': ['分析', '数据', '统计', '图表', '报告', 'excel', 'sql']
    };

    // 自动标签
    function autoTag(content) {
      const contentLower = content.toLowerCase();
      const tags = new Set();
      for (const [tag, keywords] of Object.entries(autoTagKeywords)) {
        if (keywords.some(kw => contentLower.includes(kw.toLowerCase()))) {
          tags.add(tag);
        }
      }
      return Array.from(tags);
    }

    // 简单 Diff 算法
    function computeDiff(text1, text2) {
      const lines1 = text1.split('\n');
      const lines2 = text2.split('\n');
      const diff = [];

      const maxLen = Math.max(lines1.length, lines2.length);
      for (let i = 0; i < maxLen; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';

        if (line1 === line2) {
          diff.push({ type: 'same', line1: i + 1, line2: i + 1, text: line1 });
        } else if (!line1 && line2) {
          diff.push({ type: 'add', line2: i + 1, text: line2 });
        } else if (line1 && !line2) {
          diff.push({ type: 'remove', line1: i + 1, text: line1 });
        } else {
          diff.push({ type: 'change', line1: i + 1, line2: i + 1, text1: line1, text2: line2 });
        }
      }
      return diff;
    }

    // 版本历史管理
    function addVersionHistory(template) {
      if (!template.history) template.history = [];
      template.history.push({
        content: template.content,
        timestamp: new Date().toISOString()
      });
      // 最多保留 10 个历史版本
      if (template.history.length > 10) {
        template.history.shift();
      }
    }

    // ========== M4 功能结束 ==========

    // 切换置顶状态
    function togglePin(template, event) {
      event.stopPropagation();
      template.pinned = !template.pinned;
      template.updatedAt = new Date().toISOString();
      saveTemplates();
      showToast(template.pinned ? '已置顶' : '已取消置顶');
    }

    // 删除模板
    function deleteTemplate(template, event) {
      event.stopPropagation();
      const index = templates.value.findIndex(t => t.id === template.id);
      if (index !== -1) {
        templates.value.splice(index, 1);
        saveTemplates();
        showToast('已删除');
      }
    }

    // 编辑模板
    function editTemplate(template, event) {
      event.stopPropagation();
      editingTemplate.value = { ...template };
      showEditModal.value = true;
    }

    // 保存编辑
    function saveEditTemplate() {
      if (!editingTemplate.value.name.trim()) {
        showToast('模板名称不能为空', 'error');
        return;
      }

      // 保存版本历史 (M4.5)
      const index = templates.value.findIndex(t => t.id === editingTemplate.value.id);
      if (index !== -1) {
        addVersionHistory(templates.value[index]);
      }

      // 自动解析变量
      editingTemplate.value.variables = parseVariables(editingTemplate.value.content);
      editingTemplate.value.updatedAt = new Date().toISOString();

      if (index !== -1) {
        templates.value[index] = editingTemplate.value;
        saveTemplates();
        showToast('已保存');
      }

      showEditModal.value = false;
      editingTemplate.value = null;
    }

    // 查看相似模板 (M4.1)
    function showSimilar(template, event) {
      event.stopPropagation();
      similarTemplates.value = findSimilarTemplates(template, 0.3);
      showSimilarModal.value = true;
    }

    // 对比模板 (M4.4)
    function showDiff(template, event) {
      event.stopPropagation();
      compareTemplate.value = template;
      // 与当前版本对比
      diffResult.value = computeDiff(template.history?.[0]?.content || '', template.content);
      showDiffModal.value = true;
    }

    // 查看历史 (M4.5)
    function showHistory(template, event) {
      event.stopPropagation();
      templateHistory.value = template.history || [];
      compareTemplate.value = template;
      showHistoryModal.value = true;
    }

    // 恢复到历史版本
    function restoreVersion(historyItem) {
      if (!compareTemplate.value) return;
      compareTemplate.value.content = historyItem.content;
      compareTemplate.value.updatedAt = new Date().toISOString();
      saveTemplates();
      showHistoryModal.value = false;
      showToast('已恢复到历史版本');
    }

    const showEditModal = ref(false);
    const editingTemplate = ref(null);

    // M4 新增状态
    const showSimilarModal = ref(false);
    const similarTemplates = ref([]);
    const showDiffModal = ref(false);
    const diffResult = ref([]);
    const compareTemplate = ref(null);
    const showHistoryModal = ref(false);
    const templateHistory = ref([]);

    function generateFromTemplate(template, values) {
      let result = template.content;
      Object.entries(values).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `[${key}]`);
      });
      return result;
    }

    function copyTemplateResult() {
      const result = generateFromTemplate(currentTemplate.value, fillValues.value);
      handleCopy(result);

      const t = currentTemplate.value;
      t.usage.count = (t.usage.count || 0) + 1;
      t.usage.lastUsed = new Date().toISOString();
      saveTemplates();
    }

    const currentTemplate = ref(null);
    const fillValues = ref({});

    function goBack() {
      if (viewHistory.value.length > 0) {
        const lastState = viewHistory.value.pop();
        if (lastState.view === 'fill') {
          currentView.value = 'fill';
          currentTemplate.value = lastState.template;
          fillValues.value = lastState.fillValues || {};
        } else if (lastState.view === 'input') {
          currentView.value = 'input';
          promptInput.value = lastState.promptInput || '';
          templateName.value = lastState.templateName || '';
          templateCategory.value = lastState.templateCategory || '';
        } else {
          currentView.value = 'main';
        }
        return;
      }

      if (currentView.value === 'fill' || currentView.value === 'input') {
        currentView.value = 'main';
        currentTemplate.value = null;
        promptInput.value = '';
      } else if (showSettings.value) {
        showSettings.value = false;
        currentView.value = 'main';
      } else {
        if (window.electronAPI?.window) {
          window.electronAPI.window.minimize();
        }
      }
    }

    function navigateTo(view, options = {}) {
      const state = {
        view: currentView.value,
        timestamp: Date.now()
      };

      if (currentView.value === 'fill') {
        state.template = currentTemplate.value;
        state.fillValues = { ...fillValues.value };
      } else if (currentView.value === 'input') {
        state.promptInput = promptInput.value;
        state.templateName = templateName.value;
        state.templateCategory = templateCategory.value;
      }

      if (view === 'fill' && options.template) {
        currentTemplate.value = options.template;
        fillValues.value = {};
        options.template.variables.forEach(v => {
          fillValues.value[v.key] = v.default || '';
        });
      } else if (view === 'input') {
        promptInput.value = options.promptInput || '';
        templateName.value = options.templateName || '';
        templateCategory.value = options.templateCategory || '';
      }

      viewHistory.value.push(state);
      currentView.value = view;
    }

    onMounted(async () => {
      await loadSettings();
      await loadTemplates();

      // 加载草稿
      const hasDraft = loadDraft();
      if (hasDraft) {
        navigateTo('input', {
          promptInput: promptInput.value,
          templateName: templateName.value,
          templateCategory: templateCategory.value
        });
      }

      try {
        windowMode.value = await window.electronAPI.window.getMode();
      } catch (err) {
        console.error('Failed to get window mode:', err);
      }

      if (window.electronAPI?.window) {
        window.electronAPI.window.onModeChanged((mode) => {
          windowMode.value = mode;
        });
      }

      if (window.electronAPI?.clipboard) {
        window.electronAPI.clipboard.onChanged((text) => {
          handleClipboardChanged(text);
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          goBack();
        }
      });

      // 自动保存草稿
      let draftSaveTimer = null;
      watch([promptInput, templateName, templateCategory], () => {
        if (currentView.value === 'input') {
          if (draftSaveTimer) clearTimeout(draftSaveTimer);
          draftSaveTimer = setTimeout(() => {
            saveDraft();
          }, 500);
        }
      });

      // 自动保存设置
      let settingsSaveTimer = null;
      watch(() => JSON.stringify(settings.value.theme), () => {
        if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
        settingsSaveTimer = setTimeout(() => {
          saveSettings();
        }, 300);
      });
    });

    return {
      windowMode,
      clipboardEnabled,
      inputText,
      templates,
      searchQuery,
      filteredTemplates,
      currentView,
      showSettings,
      showAddBackground,
      newBackgroundUrl,
      settings,
      recentTemplates,
      toast,
      clipboardAlert,
      promptInput,
      templateName,
      templateCategory,
      accentColorStyle,
      currentTemplate,
      fillValues,
      selectedCategory,
      categories,
      showEditModal,
      editingTemplate,
      // M4 新增
      showSimilarModal,
      similarTemplates,
      showDiffModal,
      diffResult,
      compareTemplate,
      showHistoryModal,
      templateHistory,
      selectTemplate,
      copyTemplateResult,
      handleCopy,
      handlePaste,
      showPromptInput,
      clearInput,
      saveToTemplate,
      toggleClipboardMonitor,
      goBack,
      navigateTo,
      viewHistory,
      generateFromTemplate,
      showSimilar,
      showDiff,
      showHistory,
      restoreVersion,
      togglePin,
      deleteTemplate,
      editTemplate,
      saveEditTemplate,
      handleBackgroundDrop,
      handleBackgroundDragOver,
      selectLocalImage,
      addCustomBackground,
      deleteCustomBackground
    };
  },
  template: '#app-template'
};

createApp(App).mount('#app');
