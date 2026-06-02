const STORAGE_KEY = "product-dev-board-projects";
const PRIORITY_OPTIONS = ["S类", "A类", "B类", "C类"];
const PROJECT_STATUS_OPTIONS = ["未开始", "进行中", "待确认", "已完成"];

// 默认项目数据：localStorage 没有数据时使用
const defaultProjects = [
  {
    name: "BSR 空气甲护膝 26款",
    priority: "S类",
    status: "生产文档整理中",
    projectStatus: "进行中",
    deadline: "2026-06-10",
    nextStep: "确认最终生产资料",
  },
  {
    name: "深护 TFCC 护腕超薄款",
    priority: "A类",
    status: "推进 BOM 和打样图稿",
    projectStatus: "进行中",
    deadline: "2026-06-15",
    nextStep: "完善结构细节",
  },
  {
    name: "7D 签名护膝",
    priority: "B类",
    status: "等待配色方案",
    projectStatus: "待确认",
    deadline: "2026-06-20",
    nextStep: "同步 Logo 方案",
  },
  {
    name: "签名版 Pro 单髌骨带",
    priority: "A类",
    status: "等待样品确认",
    projectStatus: "待确认",
    deadline: "2026-06-18",
    nextStep: "确认样品外观",
  },
  {
    name: "SE-S 支撑护膝",
    priority: "C类",
    status: "样品待确认",
    projectStatus: "未开始",
    deadline: "",
    nextStep: "记录测试反馈",
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

function createDefaultProjects() {
  return defaultProjects.map((project) => ({ ...project }));
}

function normalizeProject(project) {
  if (!project
    || typeof project.name !== "string"
    || !PRIORITY_OPTIONS.includes(project.priority)
    || typeof project.status !== "string"
    || typeof project.nextStep !== "string") {
    return null;
  }

  // 兼容旧版 localStorage：没有项目状态或截止时间时补默认值
  const projectStatus = PROJECT_STATUS_OPTIONS.includes(project.projectStatus)
    ? project.projectStatus
    : "进行中";
  const deadline = typeof project.deadline === "string" ? project.deadline : "";

  return {
    name: project.name,
    priority: project.priority,
    status: project.status,
    projectStatus,
    deadline,
    nextStep: project.nextStep,
  };
}

function isValidProject(project) {
  return Boolean(normalizeProject(project));
}

function loadProjects() {
  const savedProjects = localStorage.getItem(STORAGE_KEY);

  if (!savedProjects) {
    return createDefaultProjects();
  }

  try {
    const parsedProjects = JSON.parse(savedProjects);

    if (Array.isArray(parsedProjects)) {
      return parsedProjects.map(normalizeProject).filter(Boolean);
    }
  } catch (error) {
    console.warn("读取项目数据失败，已恢复默认项目。", error);
  }

  return createDefaultProjects();
}

// 保存完整项目列表，确保新增和删除刷新后仍然保留
function saveProjects() {
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
  return [project.name, project.status, project.projectStatus, project.nextStep]
    .some((value) => value.toLowerCase().includes(normalizedKeyword));
}

function openEditDialog(projectIndex) {
  const project = projects[projectIndex];

  if (!project) {
    return;
  }

  // 打开编辑表单前先填入当前项目数据，取消时不会改动原数据
  editProjectForm.elements.index.value = projectIndex;
  editProjectForm.elements.name.value = project.name;
  editProjectForm.elements.priority.value = project.priority;
  editProjectForm.elements.status.value = project.status;
  editProjectForm.elements.projectStatus.value = project.projectStatus;
  editProjectForm.elements.deadline.value = project.deadline;
  editProjectForm.elements.nextStep.value = project.nextStep;

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
    const originalIndex = projects.indexOf(project);
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
      <article class="project-card priority-${priorityClass} ${cardStateClass}" data-project-index="${originalIndex}">
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
              <button class="edit-button" type="button" data-edit-index="${originalIndex}" aria-label="编辑 ${escapeHTML(project.name)}">编辑</button>
              <button class="delete-button" type="button" data-delete-index="${originalIndex}" aria-label="删除 ${escapeHTML(project.name)}">删除</button>
            </div>
          </div>
        </div>
        <div class="card-detail">
          <div class="detail-item">
            <span class="detail-label">当前状态</span>
            <p class="detail-value">${escapeHTML(project.status)}</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">截止时间</span>
            <p class="detail-value deadline-value">${escapeHTML(getDeadlineText(project.deadline))}</p>
          </div>
          <div class="detail-item">
            <span class="detail-label">下一步任务</span>
            <p class="detail-value">${escapeHTML(project.nextStep)}</p>
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
    name: getTrimmedValue(formData, "name"),
    priority: getTrimmedValue(formData, "priority"),
    status: getTrimmedValue(formData, "status"),
    projectStatus: getTrimmedValue(formData, "projectStatus"),
    deadline: getTrimmedValue(formData, "deadline"),
    nextStep: getTrimmedValue(formData, "nextStep"),
  };

  if (!newProject.name
    || !PRIORITY_OPTIONS.includes(newProject.priority)
    || !newProject.status
    || !PROJECT_STATUS_OPTIONS.includes(newProject.projectStatus)
    || !newProject.nextStep) {
    return;
  }

  projects.unshift(newProject);
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
    openEditDialog(Number(editButton.dataset.editIndex));
    return;
  }

  if (!deleteButton) {
    return;
  }

  const projectIndex = Number(deleteButton.dataset.deleteIndex);
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
  const projectIndex = Number(formData.get("index"));

  if (!projects[projectIndex]) {
    closeEditDialog();
    return;
  }

  const updatedProject = {
    name: getTrimmedValue(formData, "name"),
    priority: getTrimmedValue(formData, "priority"),
    status: getTrimmedValue(formData, "status"),
    projectStatus: getTrimmedValue(formData, "projectStatus"),
    deadline: getTrimmedValue(formData, "deadline"),
    nextStep: getTrimmedValue(formData, "nextStep"),
  };

  if (!updatedProject.name
    || !PRIORITY_OPTIONS.includes(updatedProject.priority)
    || !updatedProject.status
    || !PROJECT_STATUS_OPTIONS.includes(updatedProject.projectStatus)
    || !updatedProject.nextStep) {
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

  // 清空本地保存并回到默认列表
  localStorage.removeItem(STORAGE_KEY);
  projects = createDefaultProjects();
  setActiveFilter("全部");
  searchKeyword = "";
  projectSearchInput.value = "";
  renderProjects();
});

renderProjects();
