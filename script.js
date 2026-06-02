const STORAGE_KEY = "productDevBoardProjects";
const LEGACY_STORAGE_KEYS = ["product-dev-board-projects"];
const PRIORITY_OPTIONS = ["S类", "A类", "B类", "C类"];
const PROJECT_STATUS_OPTIONS = ["未开始", "进行中", "待确认", "已完成"];
const BACKUP_FILE_NAME = "product-projects-backup.json";

// 默认项目数据：localStorage 没有数据时使用
const defaultProjects = [
  {
    id: "default-bsr-air-knee-26",
    name: "BSR 空气甲护膝 26款",
    priority: "S类",
    currentStatus: "生产文档整理中",
    projectStatus: "进行中",
    deadline: "2026-06-10",
    nextTask: "确认最终生产资料",
  },
  {
    id: "default-tfcc-wrist-ultra-thin",
    name: "深护 TFCC 护腕超薄款",
    priority: "A类",
    currentStatus: "推进 BOM 和打样图稿",
    projectStatus: "进行中",
    deadline: "2026-06-15",
    nextTask: "完善结构细节",
  },
  {
    id: "default-7d-signature-knee",
    name: "7D 签名护膝",
    priority: "B类",
    currentStatus: "等待配色方案",
    projectStatus: "待确认",
    deadline: "2026-06-20",
    nextTask: "同步 Logo 方案",
  },
  {
    id: "default-signature-pro-patella",
    name: "签名版 Pro 单髌骨带",
    priority: "A类",
    currentStatus: "等待样品确认",
    projectStatus: "待确认",
    deadline: "2026-06-18",
    nextTask: "确认样品外观",
  },
  {
    id: "default-se-s-support-knee",
    name: "SE-S 支撑护膝",
    priority: "C类",
    currentStatus: "样品待确认",
    projectStatus: "未开始",
    deadline: "",
    nextTask: "记录测试反馈",
  },
];

const projectGrid = document.querySelector("#project-grid");
const filterButtons = document.querySelectorAll(".filter-button");
const visibleCount = document.querySelector("#visible-count");
const addProjectForm = document.querySelector("#add-project-form");
const resetProjectsButton = document.querySelector("#reset-projects");
const projectSearchInput = document.querySelector("#project-search");
const editProjectDialog = document.querySelector("#edit-project-dialog");
const editProjectForm = document.querySelector("#edit-project-form");
const editCancelButtons = document.querySelectorAll("[data-edit-cancel]");
const statTotal = document.querySelector("#stat-total");
const statS = document.querySelector("#stat-s");
const statA = document.querySelector("#stat-a");
const statProgressing = document.querySelector("#stat-progressing");
const statDone = document.querySelector("#stat-done");
const statOverdue = document.querySelector("#stat-overdue");
const completionLabel = document.querySelector("#completion-label");
const completionBar = document.querySelector("#completion-bar");
const exportProjectsButton = document.querySelector("#export-projects");
const importProjectsFileInput = document.querySelector("#import-projects-file");

let activeFilter = "全部";
let searchKeyword = "";
let projects = loadProjects();

function getPriorityClass(priority) {
  return priority.replace("类", "").toLowerCase();
}

function getProjectStatusClass(projectStatus) {
  return {
    "未开始": "not-started",
    "进行中": "in-progress",
    "待确认": "pending",
    "已完成": "done",
  }[projectStatus] || "not-started";
}

function getDeadlineText(deadline) {
  return deadline || "未设置";
}

function getTodayDateOnly() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDeadlineDate(deadline) {
  if (!deadline) {
    return null;
  }

  const [year, month, day] = deadline.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getDaysUntilDeadline(project, today = getTodayDateOnly()) {
  const deadlineDate = parseDeadlineDate(project.deadline);

  if (!deadlineDate || project.projectStatus === "已完成") {
    return null;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((deadlineDate - today) / millisecondsPerDay);
}

function isProjectOverdue(project, today = getTodayDateOnly()) {
  const daysUntilDeadline = getDaysUntilDeadline(project, today);

  // 非已完成且截止时间早于今天，判定为逾期
  return daysUntilDeadline !== null && daysUntilDeadline < 0;
}

function isProjectDueSoon(project, today = getTodayDateOnly()) {
  const daysUntilDeadline = getDaysUntilDeadline(project, today);

  // 非已完成、未逾期且距离截止小于等于 3 天，判定为即将到期
  return daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 3;
}

function getProjectStats() {
  const today = getTodayDateOnly();
  const total = projects.length;
  const done = projects.filter((project) => project.projectStatus === "已完成").length;

  return {
    total,
    s: projects.filter((project) => project.priority === "S类").length,
    a: projects.filter((project) => project.priority === "A类").length,
    progressing: projects.filter((project) => project.projectStatus === "进行中").length,
    done,
    overdue: projects.filter((project) => isProjectOverdue(project, today)).length,
    completion: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

function renderOverview() {
  const stats = getProjectStats();

  // 数据总览始终基于完整项目列表计算，不受搜索和筛选影响
  statTotal.textContent = stats.total;
  statS.textContent = stats.s;
  statA.textContent = stats.a;
  statProgressing.textContent = stats.progressing;
  statDone.textContent = stats.done;
  statOverdue.textContent = stats.overdue;
  completionLabel.textContent = `完成进度 ${stats.completion}%`;
  completionBar.style.setProperty("--completion", `${stats.completion}%`);
}

function getPriorityProgress(priority) {
  const priorityProgress = {
    "S类": "86%",
    "A类": "66%",
    "B类": "48%",
    "C类": "30%",
  };

  return priorityProgress[priority] || "56%";
}

function escapeHTML(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));
}

function getTrimmedValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function createProjectId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultProjects() {
  return defaultProjects.map((project) => ({ ...project }));
}

function normalizeProject(project) {
  if (!project
    || typeof project.name !== "string"
    || !PRIORITY_OPTIONS.includes(project.priority)) {
    return null;
  }

  // 兼容旧版数据字段：status/nextStep 会统一整理为 currentStatus/nextTask
  const currentStatus = typeof project.currentStatus === "string"
    ? project.currentStatus
    : project.status;
  const nextTask = typeof project.nextTask === "string"
    ? project.nextTask
    : project.nextStep;

  if (typeof currentStatus !== "string" || typeof nextTask !== "string") {
    return null;
  }

  // 兼容旧版 localStorage：没有项目状态、截止时间或 id 时补默认值
  const projectStatus = PROJECT_STATUS_OPTIONS.includes(project.projectStatus)
    ? project.projectStatus
    : "进行中";
  const deadline = typeof project.deadline === "string" ? project.deadline : "";
  const id = typeof project.id === "string" && project.id.trim()
    ? project.id
    : createProjectId();

  return {
    id,
    name: project.name,
    priority: project.priority,
    currentStatus,
    projectStatus,
    deadline,
    nextTask,
  };
}

function isValidProject(project) {
  return Boolean(normalizeProject(project));
}

function normalizeProjectList(projectList) {
  if (!Array.isArray(projectList)) {
    return null;
  }

  const normalizedProjects = projectList.map(normalizeProject);

  // 导入文件必须每一项都是有效项目，避免半截数据覆盖当前看板
  if (normalizedProjects.some((project) => !project)) {
    return null;
  }

  return normalizedProjects;
}

function getExportProjects() {
  // 导出字段与 localStorage 保存结构保持一致，便于后续直接恢复
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    priority: project.priority,
    currentStatus: project.currentStatus,
    projectStatus: project.projectStatus,
    deadline: project.deadline,
    nextTask: project.nextTask,
  }));
}

function exportProjects() {
  const backupContent = JSON.stringify(getExportProjects(), null, 2);
  const backupBlob = new Blob([backupContent], { type: "application/json;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(backupBlob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = BACKUP_FILE_NAME;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
}

function importProjects(file) {
  if (!file) {
    return;
  }

  if (!window.confirm("导入数据会覆盖当前项目列表，确认继续吗？")) {
    importProjectsFileInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const parsedProjects = JSON.parse(String(reader.result || ""));
      const importedProjects = normalizeProjectList(parsedProjects);

      if (!importedProjects) {
        window.alert("导入的文件格式不正确");
        return;
      }

      // 导入成功后立即刷新页面状态并写入 localStorage，确保刷新后仍保留
      projects = importedProjects;
      saveProjects();
      setActiveFilter("全部");
      searchKeyword = "";
      projectSearchInput.value = "";
      renderProjects();
      window.alert("数据导入成功");
    } catch (error) {
      console.warn("导入项目数据失败。", error);
      window.alert("文件格式错误");
    } finally {
      importProjectsFileInput.value = "";
    }
  });

  reader.addEventListener("error", () => {
    window.alert("文件格式错误");
    importProjectsFileInput.value = "";
  });

  reader.readAsText(file);
}

function parseSavedProjects(savedProjects) {
  try {
    const parsedProjects = JSON.parse(savedProjects);
    const normalizedProjects = normalizeProjectList(parsedProjects);

    if (normalizedProjects) {
      return normalizedProjects;
    }
  } catch (error) {
    console.error("读取本地数据失败", error);
  }

  return null;
}

function loadProjects() {
  // 页面初始化时优先读取固定 key 的 localStorage，只有没有本地数据时才使用默认项目。
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    const savedProjects = parseSavedProjects(saved);

    if (savedProjects) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProjects));
      return savedProjects;
    }

    return createDefaultProjects();
  }

  // 兼容旧版本 key：读取到旧数据后立即迁移到固定 key，避免读写 key 不一致。
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const legacySaved = localStorage.getItem(legacyKey);

    if (!legacySaved) {
      continue;
    }

    const legacyProjects = parseSavedProjects(legacySaved);

    if (legacyProjects) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyProjects));
      localStorage.removeItem(legacyKey);
      return legacyProjects;
    }
  }

  return createDefaultProjects();
}

function saveProjects() {
  // 每次新增、编辑、删除、导入或恢复默认后，都保存完整 projects 数组到同一个 localStorage key。
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function setActiveFilter(filter) {
  activeFilter = filter;

  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === activeFilter);
  });
}

function closeEditDialog() {
  editProjectForm.reset();

  if (typeof editProjectDialog.close === "function") {
    editProjectDialog.close();
  }
}

function isProjectMatchedBySearch(project) {
  if (!searchKeyword) {
    return true;
  }

  const normalizedKeyword = searchKeyword.toLowerCase();

  // 搜索同时覆盖项目名称、当前状态、项目状态和下一步任务
  return [project.name, project.currentStatus, project.projectStatus, project.nextTask]
    .some((value) => value.toLowerCase().includes(normalizedKeyword));
}

function findProjectIndexById(projectId) {
  return projects.findIndex((project) => project.id === projectId);
}

function openEditDialog(projectId) {
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  // 打开编辑表单前先填入当前项目数据，取消时不会改动原数据
  editProjectForm.elements.id.value = project.id;
  editProjectForm.elements.name.value = project.name;
  editProjectForm.elements.priority.value = project.priority;
  editProjectForm.elements.status.value = project.currentStatus;
  editProjectForm.elements.projectStatus.value = project.projectStatus;
  editProjectForm.elements.deadline.value = project.deadline;
  editProjectForm.elements.nextStep.value = project.nextTask;

  if (typeof editProjectDialog.showModal === "function") {
    editProjectDialog.showModal();
  } else {
    editProjectDialog.setAttribute("open", "");
  }
}

// 根据优先级筛选和搜索关键词共同渲染项目卡片
function renderProjects(filter = activeFilter) {
  renderOverview();
  const visibleProjects = projects.filter((project) => {
    const isMatchedByFilter = filter === "全部" || project.priority === filter;
    return isMatchedByFilter && isProjectMatchedBySearch(project);
  });

  visibleCount.textContent = visibleProjects.length;

  if (visibleProjects.length === 0) {
    projectGrid.innerHTML = '<p class="empty-state">暂无符合当前筛选或搜索条件的项目</p>';
    return;
  }

  projectGrid.innerHTML = visibleProjects.map((project) => {
    const priorityClass = getPriorityClass(project.priority);
    const projectStatusClass = getProjectStatusClass(project.projectStatus);
    const isOverdue = isProjectOverdue(project);
    const isDueSoon = isProjectDueSoon(project);
    const timingBadge = isOverdue
      ? '<span class="timing-badge overdue">已逾期</span>'
      : isDueSoon
        ? '<span class="timing-badge due-soon">即将到期</span>'
        : '';
    const cardStateClass = isOverdue ? "is-overdue" : isDueSoon ? "is-due-soon" : "";

    return `
      <article class="project-card priority-${priorityClass} ${cardStateClass}" data-project-id="${escapeHTML(project.id)}">
        <div class="card-top">
          <div class="card-title-group">
            <span class="project-code">Dev Sprint / ${priorityClass.toUpperCase()}-Guard</span>
            <h2>${escapeHTML(project.name)}</h2>
          </div>
          <div class="card-actions">
            <div class="badge-stack">
              <span class="priority-badge ${priorityClass}">${project.priority}</span>
              <span class="status-badge ${projectStatusClass}">${escapeHTML(project.projectStatus)}</span>
              ${timingBadge}
            </div>
            <div class="card-action-buttons">
              <button class="edit-button" type="button" data-edit-id="${escapeHTML(project.id)}" aria-label="编辑 ${escapeHTML(project.name)}">编辑</button>
              <button class="delete-button" type="button" data-delete-id="${escapeHTML(project.id)}" aria-label="删除 ${escapeHTML(project.name)}">删除</button>
            </div>
          </div>
        </div>
        <div class="card-detail">
          <div class="detail-item">
            <span class="detail-label">当前状态</span>
            <p class="detail-value">${escapeHTML(project.currentStatus)}</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">截止时间</span>
            <p class="detail-value deadline-value">${escapeHTML(getDeadlineText(project.deadline))}</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">下一步任务</span>
            <p class="detail-value">${escapeHTML(project.nextTask)}</p>
          </div>
        </div>
        <div class="card-footer" aria-hidden="true">
          <span>Impact Readiness</span>
          <div class="progress-track"><span style="--progress: ${getPriorityProgress(project.priority)}"></span></div>
        </div>
      </article>
    `;
  }).join("");
}

exportProjectsButton.addEventListener("click", exportProjects);

importProjectsFileInput.addEventListener("change", (event) => {
  importProjects(event.target.files?.[0]);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveFilter(button.dataset.filter);
    renderProjects();
  });
});

projectSearchInput.addEventListener("input", () => {
  // 搜索关键词与优先级筛选叠加生效
  searchKeyword = projectSearchInput.value.trim();
  renderProjects();
});

addProjectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(addProjectForm);
  const newProject = {
    id: createProjectId(),
    name: getTrimmedValue(formData, "name"),
    priority: getTrimmedValue(formData, "priority"),
    currentStatus: getTrimmedValue(formData, "status"),
    projectStatus: getTrimmedValue(formData, "projectStatus"),
    deadline: getTrimmedValue(formData, "deadline"),
    nextTask: getTrimmedValue(formData, "nextStep"),
  };

  if (!newProject.name
    || !PRIORITY_OPTIONS.includes(newProject.priority)
    || !newProject.currentStatus
    || !PROJECT_STATUS_OPTIONS.includes(newProject.projectStatus)
    || !newProject.nextTask) {
    return;
  }

  projects.push(newProject);
  saveProjects();
  addProjectForm.reset();
  setActiveFilter(newProject.priority);
  renderProjects();
});

// 使用事件委托处理编辑和删除按钮，保持卡片重新渲染后按钮仍然可用
projectGrid.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-button");
  const deleteButton = event.target.closest(".delete-button");

  if (editButton) {
    openEditDialog(editButton.dataset.editId);
    return;
  }

  if (!deleteButton) {
    return;
  }

  const projectId = deleteButton.dataset.deleteId;
  const projectIndex = findProjectIndexById(projectId);
  const project = projects[projectIndex];

  if (!project || !window.confirm(`确认删除「${project.name}」吗？`)) {
    return;
  }

  projects.splice(projectIndex, 1);
  saveProjects();
  renderProjects();
});

editProjectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(editProjectForm);
  const projectId = String(formData.get("id") || "");
  const projectIndex = findProjectIndexById(projectId);

  if (projectIndex < 0) {
    closeEditDialog();
    return;
  }

  const updatedProject = {
    id: projectId,
    name: getTrimmedValue(formData, "name"),
    priority: getTrimmedValue(formData, "priority"),
    currentStatus: getTrimmedValue(formData, "status"),
    projectStatus: getTrimmedValue(formData, "projectStatus"),
    deadline: getTrimmedValue(formData, "deadline"),
    nextTask: getTrimmedValue(formData, "nextStep"),
  };

  if (!updatedProject.name
    || !PRIORITY_OPTIONS.includes(updatedProject.priority)
    || !updatedProject.currentStatus
    || !PROJECT_STATUS_OPTIONS.includes(updatedProject.projectStatus)
    || !updatedProject.nextTask) {
    return;
  }

  // 保存编辑后的完整项目列表，刷新页面后仍从 localStorage 读取最新内容
  projects[projectIndex] = updatedProject;
  saveProjects();
  renderProjects();
  closeEditDialog();
});

editCancelButtons.forEach((button) => {
  button.addEventListener("click", closeEditDialog);
});

editProjectDialog.addEventListener("click", (event) => {
  if (event.target === editProjectDialog) {
    closeEditDialog();
  }
});

resetProjectsButton.addEventListener("click", () => {
  if (!window.confirm("确认恢复默认项目吗？这会清除你新增或删除后的项目列表。")) {
    return;
  }

  // 只有恢复默认项目允许覆盖用户数据；覆盖后也立即保存到 localStorage。
  projects = createDefaultProjects();
  saveProjects();
  setActiveFilter("全部");
  searchKeyword = "";
  projectSearchInput.value = "";
  renderProjects();
});

renderProjects();
