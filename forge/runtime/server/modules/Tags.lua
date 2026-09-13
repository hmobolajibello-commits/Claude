--!strict
-- The gameplay engine.
--
-- Geometry in this game carries no scripts. Every interactive brick is listed in
-- MapData with a tag and a small data table, and the behaviour for that tag
-- lives here. That is why forge can rebuild a whole map from JSON without
-- touching a line of Luau: adding a killbrick is adding a tag, not a script.

local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local MapData = require(Shared:WaitForChild("MapData"))
local Save = require(script.Parent:WaitForChild("Save"))
local Economy = require(script.Parent:WaitForChild("Economy"))

local Tags = {}

-- Per-part config, and per-(part, player) touch cooldowns.
local dataOf: { [Instance]: any } = {}
local cooldowns: { [Instance]: { [Player]: number } } = {}
local animated: { [BasePart]: any } = {}

local function data(part: Instance): any
	return dataOf[part] or {}
end

local function ready(part: Instance, player: Player, seconds: number): boolean
	local perPart = cooldowns[part]
	if not perPart then
		perPart = {}
		cooldowns[part] = perPart
	end
	local now = os.clock()
	if perPart[player] and now - perPart[player] < seconds then
		return false
	end
	perPart[player] = now
	return true
end

local function subject(hit: BasePart?): (Player?, Humanoid?)
	if not hit then
		return nil, nil
	end
	local character = hit.Parent
	if not character then
		return nil, nil
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if not humanoid or humanoid.Health <= 0 then
		return nil, nil
	end
	return Players:GetPlayerFromCharacter(character), humanoid
end

local function onTouch(part: BasePart, handler: (Player, Humanoid, BasePart) -> ())
	part.Touched:Connect(function(hit)
		local player, humanoid = subject(hit)
		if player and humanoid then
			handler(player, humanoid, part)
		end
	end)
end

--------------------------------------------------------------------------------
-- Behaviours, keyed by tag.
--------------------------------------------------------------------------------

local behaviours: { [string]: (BasePart) -> () } = {}

behaviours.ForgeKill = function(part)
	onTouch(part, function(_, humanoid)
		humanoid.Health = 0
	end)
end

behaviours.ForgeDamage = function(part)
	onTouch(part, function(player, humanoid)
		local config = data(part)
		if ready(part, player, config.cooldown or 1) then
			humanoid:TakeDamage(config.damage or 10)
		end
	end)
end

behaviours.ForgeHeal = function(part)
	onTouch(part, function(player, humanoid)
		if ready(part, player, data(part).cooldown or 3) then
			humanoid.Health = humanoid.MaxHealth
			Economy.notify(player, "Healed", "good")
		end
	end)
end

behaviours.ForgeCheckpoint = function(part)
	onTouch(part, function(player)
		local order = data(part).order or 1
		local profile = Save.get(player)
		if (profile.checkpoint or 0) >= order then
			return
		end
		profile.checkpoint = order
		if order > (profile.best or 0) then
			profile.best = order
		end
		local reward = data(part).reward or (Settings.checkpoints and Settings.checkpoints.reward) or 0
		if reward > 0 then
			Economy.award(player, reward)
		end
		Economy.push(player)
		Economy.notify(player, string.format("Checkpoint %d reached", order), "good")
	end)
end

behaviours.ForgeCoin = function(part)
	onTouch(part, function(player)
		if part.Transparency >= 1 or not ready(part, player, 0.5) then
			return
		end
		local config = data(part)
		Economy.award(player, config.value or (Settings.coins and Settings.coins.value) or 5)

		part.Transparency = 1
		part.CanCollide = false
		part.CanTouch = false
		task.delay(config.respawn or (Settings.coins and Settings.coins.respawn) or 8, function()
			if part.Parent then
				part.Transparency = 0
				part.CanTouch = true
			end
		end)
	end)
end

-- Simulator loop: orbs fill the backpack, the sell pad converts it to currency.
behaviours.ForgeOrb = function(part)
	onTouch(part, function(player)
		if part.Transparency >= 1 or not ready(part, player, 0.4) then
			return
		end
		local profile = Save.get(player)
		local capacity = profile.capacity or (Settings.backpack and Settings.backpack.capacity) or 25
		if (profile.carried or 0) >= capacity then
			Economy.notify(player, "Backpack full -- sell what you have", "warn")
			return
		end
		profile.carried = math.min(capacity, (profile.carried or 0) + (data(part).value or 1))
		Economy.push(player)

		part.Transparency = 1
		part.CanTouch = false
		task.delay(data(part).respawn or 4, function()
			if part.Parent then
				part.Transparency = 0
				part.CanTouch = true
			end
		end)
	end)
end

behaviours.ForgeSell = function(part)
	onTouch(part, function(player)
		if not ready(part, player, 1) then
			return
		end
		local profile = Save.get(player)
		local carried = profile.carried or 0
		if carried <= 0 then
			return
		end
		local rate = data(part).rate or (Settings.backpack and Settings.backpack.rate) or 3
		local multiplier = profile.multiplier or 1
		profile.carried = 0
		Economy.award(player, math.floor(carried * rate * multiplier + 0.5), "sold " .. tostring(carried))
	end)
end

behaviours.ForgeWin = function(part)
	onTouch(part, function(player, _, _)
		if not ready(part, player, 3) then
			return
		end
		local profile = Save.get(player)
		Economy.award(player, data(part).value or 100, "finished the course")
		Economy.addWin(player)
		Economy.notify(player, "You finished! Back to the start.", "good")
		if Settings.checkpoints and Settings.checkpoints.resetOnWin then
			profile.checkpoint = 0
		end
		task.wait(0.5)
		Tags.respawnAtCheckpoint(player)
	end)
end

behaviours.ForgeJumpPad = function(part)
	onTouch(part, function(player, humanoid)
		if not ready(part, player, 0.4) then
			return
		end
		local root = humanoid.RootPart
		if root then
			root.AssemblyLinearVelocity = Vector3.new(root.AssemblyLinearVelocity.X, data(part).power or 120, root.AssemblyLinearVelocity.Z)
		end
	end)
end

behaviours.ForgeSpeedPad = function(part)
	onTouch(part, function(player, humanoid)
		if not ready(part, player, 1) then
			return
		end
		local config = data(part)
		local bonus = config.bonus or 12
		local base = humanoid.WalkSpeed
		humanoid.WalkSpeed = base + bonus
		Economy.notify(player, "Speed boost!", "good")
		task.delay(config.duration or 5, function()
			if humanoid.Parent then
				humanoid.WalkSpeed = math.max(base, humanoid.WalkSpeed - bonus)
			end
		end)
	end)
end

behaviours.ForgeTeleport = function(part)
	onTouch(part, function(player, humanoid)
		if not ready(part, player, 2) then
			return
		end
		local targetName = data(part).target
		local map = workspace:FindFirstChild("Map")
		local target = targetName and map and map:FindFirstChild(targetName, true)
		local root = humanoid.RootPart
		if target and target:IsA("BasePart") and root then
			root.CFrame = target.CFrame + Vector3.new(0, 5, 0)
		end
	end)
end

-- Surface velocity is what actually carries a standing character, so an
-- anchored brick with a velocity behaves as a conveyor.
behaviours.ForgeConveyor = function(part)
	local config = data(part)
	local direction = config.direction and Vector3.new(config.direction[1], config.direction[2], config.direction[3])
		or part.CFrame.LookVector
	part.AssemblyLinearVelocity = direction.Unit * (config.speed or 20)
end

behaviours.ForgeSpinner = function(part)
	animated[part] = { kind = "spin", base = part.CFrame, speed = data(part).speed or 60 }
end

behaviours.ForgePlatform = function(part)
	local config = data(part)
	animated[part] = {
		kind = "platform",
		base = part.CFrame,
		offset = Vector3.new(config.offset and config.offset[1] or 0, config.offset and config.offset[2] or 0, config.offset and config.offset[3] or 24),
		period = config.period or 6,
	}
end

--------------------------------------------------------------------------------
-- Wiring
--------------------------------------------------------------------------------

function Tags.attach(part: BasePart, tag: string, config: any?)
	if config then
		dataOf[part] = config
	end
	CollectionService:AddTag(part, tag)
end

function Tags.checkpointPart(order: number): BasePart?
	for _, part in ipairs(CollectionService:GetTagged("ForgeCheckpoint")) do
		if part:IsA("BasePart") and (data(part).order or 0) == order then
			return part
		end
	end
	local spawns = CollectionService:GetTagged("ForgeStart")
	local fallback = spawns[1]
	return (fallback and fallback:IsA("BasePart")) and fallback or nil
end

function Tags.respawnAtCheckpoint(player: Player)
	local profile = Save.get(player)
	local order = profile.checkpoint or 0
	if order <= 0 then
		return
	end
	local target = Tags.checkpointPart(order)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if target and root and root:IsA("BasePart") then
		root.CFrame = target.CFrame + Vector3.new(0, 5, 0)
	end
end

local function applyBehaviour(part: Instance, tag: string)
	local behaviour = behaviours[tag]
	if behaviour and part:IsA("BasePart") then
		local ok, err = pcall(behaviour, part)
		if not ok then
			warn(string.format("[Forge] tag %s failed on %s: %s", tag, part:GetFullName(), tostring(err)))
		end
	end
end

function Tags.start()
	local map = workspace:FindFirstChild("Map")

	-- Apply the map's tags and per-part config.
	for name, entry in pairs(MapData.parts or {}) do
		local part = map and map:FindFirstChild(name, true)
		if part then
			dataOf[part] = entry.data or {}
			for _, tag in ipairs(entry.tags or {}) do
				CollectionService:AddTag(part, tag)
			end
		else
			warn(string.format("[Forge] MapData mentions %q but no such part exists", name))
		end
	end

	-- Bind behaviours to everything tagged now and to anything tagged later.
	for tag in pairs(behaviours) do
		for _, part in ipairs(CollectionService:GetTagged(tag)) do
			applyBehaviour(part, tag)
		end
		CollectionService:GetInstanceAddedSignal(tag):Connect(function(part)
			applyBehaviour(part, tag)
		end)
	end

	-- One loop drives every moving brick.
	RunService.Heartbeat:Connect(function()
		local clock = os.clock()
		for part, state in pairs(animated) do
			if not part.Parent then
				animated[part] = nil
			elseif state.kind == "spin" then
				part.CFrame = state.base * CFrame.Angles(0, math.rad(state.speed) * clock, 0)
			elseif state.kind == "platform" then
				local phase = (math.sin(clock * (2 * math.pi) / state.period) + 1) / 2
				local goal = state.base + state.offset * phase
				-- Move it, then hand the surface the matching velocity so
				-- anyone standing on it travels with the brick.
				local delta = goal.Position - part.Position
				part.CFrame = goal
				part.AssemblyLinearVelocity = delta * 60
			end
		end
	end)

	-- Respawn at the saved checkpoint.
	if Settings.checkpoints and Settings.checkpoints.enabled then
		local function hook(player: Player)
			player.CharacterAdded:Connect(function()
				task.wait(0.2)
				Tags.respawnAtCheckpoint(player)
			end)
		end
		for _, player in ipairs(Players:GetPlayers()) do
			hook(player)
		end
		Players.PlayerAdded:Connect(hook)
	end
end

return Tags
