const STORAGE_KEY = "product-dev-board-projects";
const PRIORITY_OPTIONS = ["S类", "A类", "B类", "C类"];

// 默认项目数据：localStorage 没有数据时使用
const defaultProjects = [
  {
    name: "BSR 空气甲护膝 26款",
    priority: "S类",
    status: "生产文档整理中",
    nextStep: "确认最终生产资料",
  },
  {
    name: "深护 TFCC 护腕超薄款",
    priority: "A类",
    status: "推进 BOM 和打样图稿",
    nextStep: "完善结构细节",
  },
  {
    name: "7D 签名护膝",
    priority: "B类",
    status: "等待配色方案",
    nextStep: "同步 Logo 方案",
  },
  {
    name: "签名版 Pro 单髌骨带",
    priority: "A类",
    status: "等待样品确认",
    nextStep: "确认样品外观",
  },
  {
    name: "SE-S 支撑护膝",
    priority: "C类",
    status: "样品待确认",
    nextStep: "记录测试反馈",
  },
];

const projectGrid = document.querySelector("#project-grid");
const filterButtons = document.querySelectorAll(".filter-button");
const visibleCount = document.querySelector("#visible-count");
const addProjectForm = document.querySelector("#add-project-form");
const resetProjectsButton = document.querySelector("#reset-projects");
const editProjectDialog = document.querySelector("#edit-project-dialog");
const editProjectForm = document.querySelector("#edit-project-form");
const editCancelButtons = document.querySelectorAll("[data-edit-cancel]");

let activeFilter = "全部";
let projects = loadProjects();

function getPriorityClass(priority) {
  return priority.replace("类", "").toLowerCase();
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

function isValidProject(project) {
  return project
    && typeof project.name === "string"
    && PRIORITY_OPTIONS.includes(project.priority)
    && typeof project.status === "string"
    && typeof project.nextStep === "string";
}

function loadProjects() {
  const savedProjects = localStorage.getItem(STORAGE_KEY);

  if (!savedProjects) {
    return createDefaultProjects();
  }

  try {
    const parsedProjects = JSON.parse(savedProjects);

    if (Array.isArray(parsedProjects)) {
      return parsedProjects.filter(isValidProject);
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
  editProjectForm.elements.nextStep.value = project.nextStep;

  if (typeof editProjectDialog.showModal === "function") {
    editProjectDialog.showModal();
  } else {
    editProjectDialog.setAttribute("open", "");
  }
}

// 根据筛选条件渲染项目卡片
function renderProjects(filter = activeFilter) {
  const visibleProjects = filter === "全部"
    ? projects
    : projects.filter((project) => project.priority === filter);

  visibleCount.textContent = visibleProjects.length;

  if (visibleProjects.length === 0) {
    projectGrid.innerHTML = '<p class="empty-state">暂无符合该优先级的项目</p>';
    return;
  }

  projectGrid.innerHTML = visibleProjects.map((project) => {
    const originalIndex = projects.indexOf(project);
    const priorityClass = getPriorityClass(project.priority);

    return `
      <article class="project-card priority-${priorityClass}" data-project-index="${originalIndex}">
        <div class="card-top">
          <div class="card-title-group">
            <span class="project-code">Dev Sprint / ${priorityClass.toUpperCase()}-Guard</span>
            <h2>${escapeHTML(project.name)}</h2>
          </div>
          <div class="card-actions">
            <span class="priority-badge ${priorityClass}">${project.priority}</span>
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

addProjectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(addProjectForm);
  const newProject = {
    name: getTrimmedValue(formData, "name"),
    priority: getTrimmedValue(formData, "priority"),
    status: getTrimmedValue(formData, "status"),
    nextStep: getTrimmedValue(formData, "nextStep"),
  };

  if (!newProject.name || !newProject.priority || !newProject.status || !newProject.nextStep) {
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
    nextStep: getTrimmedValue(formData, "nextStep"),
  };

  if (!updatedProject.name
    || !PRIORITY_OPTIONS.includes(updatedProject.priority)
    || !updatedProject.status
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
  renderProjects();
});

renderProjects();
