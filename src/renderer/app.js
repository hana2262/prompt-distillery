const { createApp, ref, computed, onMounted } = Vue;

const App = {
  setup() {
    const windowMode = ref('standard');
    const clipboardEnabled = ref(false);
    const inputText = ref('');
    const templates = ref([]);
    const searchQuery = ref('');
    const currentView = ref('main');
    const showSettings = ref(false);
    const settings = ref({
      theme: {
        accentColor: '#10B981',
        backgroundImage: '',
        glassEffect: true
      }
    });
    const recentTemplates = ref([]);
    const toast = ref({ show: false, message: '', type: 'success' });
    const clipboardText = ref('');
    const clipboardAlert = ref({ show: false, text: '' });
    const promptInput = ref('');
    const templateName = ref('');
    const templateCategory = ref('');

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

    const accentColorStyle = computed(() => ({
      '--accent': settings.value.theme.accentColor
    }));

    async function loadSettings() {
      try {
        const loaded = await window.electronAPI.settings.get();
        if (loaded) {
          settings.value = loaded;
          clipboardEnabled.value = loaded.clipboardMonitor?.enabled || false;
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
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
        currentView.value = 'input';
      } catch (err) {
        console.error('Failed to paste:', err);
        currentView.value = 'input';
      }
    }

    function showPromptInput() {
      currentView.value = 'input';
      promptInput.value = '';
      templateName.value = '';
      templateCategory.value = '';
    }

    // 保留此函数以备后用
    function newPrompt() {
      currentView.value = 'input';
      promptInput.value = '';
      templateName.value = '';
      templateCategory.value = '';
    }

    function clearInput() {
      promptInput.value = '';
      templateName.value = '';
      templateCategory.value = '';
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
      currentView.value = 'input';
      setTimeout(() => {
        clipboardAlert.value.show = false;
      }, 3000);
    }

    function selectTemplate(template) {
      currentView.value = 'fill';
      currentTemplate.value = template;
      fillValues.value = {};
      template.variables.forEach(v => {
        fillValues.value[v.key] = v.default || '';
      });
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
      if (currentView.value === 'fill') {
        currentView.value = 'main';
        currentTemplate.value = null;
      } else if (currentView.value === 'input') {
        currentView.value = 'main';
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

    onMounted(async () => {
      await loadSettings();
      await loadTemplates();

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
      generateFromTemplate,
      showSimilar,
      showDiff,
      showHistory,
      restoreVersion,
      togglePin,
      deleteTemplate,
      editTemplate,
      saveEditTemplate
    };
  },
  template: `
    <div class="h-full flex flex-col" :style="accentColorStyle">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div class="flex items-center gap-2">
          <button @click="goBack" class="p-1 hover:bg-gray-700 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <span class="font-semibold text-accent">Prompt 蒸馏器</span>
          <span class="text-xs px-2 py-0.5 bg-gray-700 rounded">{{ windowMode === 'mini' ? '迷你' : windowMode === 'standard' ? '标准' : '编辑' }}</span>
        </div>
        <button @click="showSettings = true" class="p-1 hover:bg-gray-700 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-auto p-4">
        <!-- Main View -->
        <template v-if="currentView === 'main'">
          <!-- Search -->
          <div class="mb-4">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索模板..."
              class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent"
            >
          </div>

          <!-- Category Filter -->
          <div class="flex gap-1 mb-3 overflow-x-auto pb-2">
            <button
              v-for="cat in categories"
              :key="cat"
              @click="selectedCategory = cat"
              :class="selectedCategory === cat ? 'bg-accent' : 'bg-gray-700'"
              class="px-3 py-1 rounded-full text-xs whitespace-nowrap"
            >
              {{ cat }}
            </button>
          </div>

          <!-- Quick Actions -->
          <div class="flex gap-2 mb-4">
            <button
              @click="toggleClipboardMonitor"
              :class="clipboardEnabled ? 'bg-accent' : 'bg-gray-700'"
              class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span v-if="clipboardEnabled" class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {{ clipboardEnabled ? '监听中' : '开启监听' }}
            </button>
            <button
              @click="handlePaste"
              class="flex-1 py-2 px-4 bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-600"
            >
              粘贴/输入
            </button>
          </div>

          <!-- Clipboard Alert -->
          <div v-if="clipboardAlert.show" class="mb-4 p-3 bg-blue-900/50 border border-blue-700 rounded-lg">
            <div class="text-sm text-blue-200">检测到新文本:</div>
            <div class="text-xs text-gray-400 mt-1 truncate">{{ clipboardAlert.text }}...</div>
          </div>

          <!-- Template List -->
          <div class="space-y-2">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              @click="selectTemplate(template)"
              class="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div class="flex justify-between items-start mb-1">
                <div class="flex items-center gap-2">
                  <span v-if="template.pinned" class="text-yellow-500">📌</span>
                  <h3 class="font-medium">{{ template.name }}</h3>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="togglePin(template, $event)" class="text-gray-400 hover:text-yellow-500" title="置顶">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5zM5 11a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z" />
                    </svg>
                  </button>
                  <button @click="editTemplate(template, $event)" class="text-gray-400 hover:text-blue-500" title="编辑">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button @click="deleteTemplate(template, $event)" class="text-gray-400 hover:text-red-500" title="删除">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <!-- M4 功能按钮 -->
                  <button @click="showSimilar(template, $event)" class="text-gray-400 hover:text-purple-500" title="查重">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button @click="showHistory(template, $event)" class="text-gray-400 hover:text-yellow-500" title="历史">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <p class="text-sm text-gray-400 line-clamp-2">{{ template.content }}</p>
              <!-- 显示自动标签 -->
              <div v-if="template.tags && template.tags.length > 0" class="flex gap-1 mt-1">
                <span v-for="tag in template.tags" :key="tag" class="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                  {{ tag }}
                </span>
              </div>
              <div class="flex justify-between items-center mt-2">
                <div class="flex gap-1">
                  <span v-for="cat in template.category" :key="cat" class="text-xs px-2 py-0.5 bg-gray-700 rounded">
                    {{ cat }}
                  </span>
                </div>
                <span class="text-xs text-gray-500">{{ template.usage?.count || 0 }}次</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Prompt Input View -->
        <template v-else-if="currentView === 'input'">
          <h2 class="text-lg font-semibold mb-4">保存 Prompt 为模板</h2>
          <div class="space-y-3 mb-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">模板名称</label>
              <input
                v-model="templateName"
                type="text"
                placeholder="给模板起个名字"
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent"
              >
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">分类标签 (逗号分隔)</label>
              <input
                v-model="templateCategory"
                type="text"
                placeholder="如: 编程, 写作, 翻译"
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent"
              >
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Prompt 内容</label>
              <textarea
                v-model="promptInput"
                rows="8"
                placeholder="在此粘贴或输入你的 Prompt..."
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent resize-none"
              ></textarea>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="clearInput"
              :disabled="!promptInput"
              class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium disabled:opacity-50"
            >
              清空
            </button>
            <button
              @click="saveToTemplate"
              :disabled="!promptInput"
              class="flex-1 py-2 bg-accent hover:opacity-90 rounded-lg font-medium disabled:opacity-50"
            >
              保存到模板库
            </button>
          </div>
        </template>

        <!-- Fill Template View -->
        <template v-else-if="currentView === 'fill' && currentTemplate">
          <h2 class="text-lg font-semibold mb-4">{{ currentTemplate.name }}</h2>
          <div class="space-y-4 mb-6">
            <div v-for="variable in currentTemplate.variables" :key="variable.key">
              <label class="block text-sm font-medium mb-1">{{ variable.label }}</label>
              <input
                v-if="variable.type !== 'textarea'"
                v-model="fillValues[variable.key]"
                type="text"
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent"
                :placeholder="variable.default"
              >
              <textarea
                v-else
                v-model="fillValues[variable.key]"
                rows="4"
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent resize-none"
                :placeholder="variable.default"
              ></textarea>
            </div>
          </div>
          <button
            @click="copyTemplateResult"
            class="w-full py-3 bg-accent hover:opacity-90 rounded-lg font-medium transition-opacity"
          >
            一键复制
          </button>
        </template>
      </div>

      <!-- Settings Drawer -->
      <div
        v-if="showSettings"
        class="fixed inset-0 bg-black/50 z-50 flex justify-end"
        @click.self="showSettings = false"
      >
        <div class="w-80 h-full bg-gray-900 border-l border-gray-700 p-4 overflow-auto">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-semibold">设置</h2>
            <button @click="showSettings = false" class="p-1 hover:bg-gray-700 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <div class="space-y-6">
            <div>
              <h3 class="text-sm font-medium mb-3">主题色</h3>
              <div class="flex gap-2">
                <button
                  v-for="color in ['#10B981', '#8B5CF6', '#3B82F6', '#F59E0B', '#F43F5E']"
                  :key="color"
                  @click="settings.theme.accentColor = color"
                  :class="settings.theme.accentColor === color ? 'ring-2 ring-white' : ''"
                  class="w-8 h-8 rounded-full"
                  :style="{ backgroundColor: color }"
                ></button>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-medium mb-3">窗口模式</h3>
              <div class="space-y-2">
                <button
                  v-for="mode in ['mini', 'standard', 'editor']"
                  :key="mode"
                  @click="window.electronAPI.window.switchMode(mode)"
                  :class="windowMode === mode ? 'bg-accent' : 'bg-gray-700'"
                  class="w-full py-2 px-4 rounded-lg text-sm font-medium"
                >
                  {{ mode === 'mini' ? '迷你模式 (300x200)' : mode === 'standard' ? '标准模式 (800x600)' : '编辑模式 (1200x800)' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-900 rounded-lg w-full max-w-md p-4">
          <h3 class="text-lg font-semibold mb-4">编辑模板</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm mb-1">名称</label>
              <input v-model="editingTemplate.name" type="text" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent">
            </div>
            <div>
              <label class="block text-sm mb-1">分类 (逗号分隔)</label>
              <input :value="editingTemplate.category?.join(', ')" @input="editingTemplate.category = $event.target.value.split(',').map(s => s.trim()).filter(s => s)" type="text" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent">
            </div>
            <div>
              <label class="block text-sm mb-1">内容 (使用 {{变量名}} 占位)</label>
              <textarea v-model="editingTemplate.content" rows="6" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent resize-none"></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="showEditModal = false" class="flex-1 py-2 bg-gray-700 rounded-lg">取消</button>
            <button @click="saveEditTemplate" class="flex-1 py-2 bg-accent rounded-lg">保存</button>
          </div>
        </div>
      </div>

      <!-- Similar Templates Modal (M4.1) -->
      <div v-if="showSimilarModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-900 rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-auto">
          <h3 class="text-lg font-semibold mb-4">相似模板</h3>
          <div v-if="similarTemplates.length === 0" class="text-gray-400 text-center py-4">未发现相似模板</div>
          <div v-else class="space-y-2">
            <div v-for="item in similarTemplates" :key="item.template.id" class="p-3 bg-gray-800 rounded-lg">
              <div class="flex justify-between items-start">
                <h4 class="font-medium">{{ item.template.name }}</h4>
                <span class="text-xs text-accent">{{ Math.round(item.similarity * 100) }}% 相似</span>
              </div>
              <p class="text-sm text-gray-400 line-clamp-2 mt-1">{{ item.template.content }}</p>
            </div>
          </div>
          <button @click="showSimilarModal = false" class="w-full py-2 bg-gray-700 rounded-lg mt-4">关闭</button>
        </div>
      </div>

      <!-- Diff Modal (M4.4) -->
      <div v-if="showDiffModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-900 rounded-lg w-full max-w-lg p-4 max-h-[80vh] overflow-auto">
          <h3 class="text-lg font-semibold mb-4">版本对比 - {{ compareTemplate?.name }}</h3>
          <div class="font-mono text-sm">
            <div v-for="(line, idx) in diffResult" :key="idx" :class="{
              'bg-green-900/30 text-green-400': line.type === 'add',
              'bg-red-900/30 text-red-400': line.type === 'remove',
              'bg-yellow-900/30 text-yellow-400': line.type === 'change',
              'text-gray-400': line.type === 'same'
            }" class="px-2 py-0.5">
              <span v-if="line.type === 'add'">+ </span>
              <span v-else-if="line.type === 'remove'">- </span>
              <span v-else-if="line.type === 'change'">~ </span>
              <span v-else>  </span>
              {{ line.text || line.text1 || line.text2 }}
            </div>
          </div>
          <button @click="showDiffModal = false" class="w-full py-2 bg-gray-700 rounded-lg mt-4">关闭</button>
        </div>
      </div>

      <!-- History Modal (M4.5) -->
      <div v-if="showHistoryModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-900 rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-auto">
          <h3 class="text-lg font-semibold mb-4">版本历史 - {{ compareTemplate?.name }}</h3>
          <div v-if="templateHistory.length === 0" class="text-gray-400 text-center py-4">暂无历史记录</div>
          <div v-else class="space-y-2">
            <div v-for="(item, idx) in templateHistory" :key="idx" class="p-3 bg-gray-800 rounded-lg">
              <div class="flex justify-between text-xs text-gray-400 mb-1">
                <span>{{ idx + 1 }}</span>
                <span>{{ new Date(item.timestamp).toLocaleString() }}</span>
              </div>
              <p class="text-sm line-clamp-3">{{ item.content }}</p>
              <button @click="restoreVersion(item)" class="text-xs text-accent hover:underline mt-1">恢复到此版本</button>
            </div>
          </div>
          <button @click="showHistoryModal = false" class="w-full py-2 bg-gray-700 rounded-lg mt-4">关闭</button>
        </div>
      </div>

      <!-- Toast -->
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg',
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-600'
        ]"
      >
        {{ toast.message }}
      </div>
    </div>
  `
};

createApp(App).mount('#app');
