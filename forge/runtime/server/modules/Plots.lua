--!strict
-- Tycoon plots: claim one per player, run its droppers, pay its owner.
--
-- Tags used, all placed by the map:
--   ForgePlot      data = { index = 1 }              the plot floor
--   ForgeDropper   data = { plot = 1, value = 2, interval = 2, locked = true }
--   ForgeCollector data = { plot = 1 }               the conveyor end
--   ForgeBuy       data = { plot = 1, cost = 250, unlocks = "Dropper2" }

local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")
local Debris = game:GetService("Debris")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local Save = require(script.Parent:WaitForChild("Save"))
local Economy = require(script.Parent:WaitForChild("Economy"))
local MapData = require(Shared:WaitForChild("MapData"))

local Plots = {}

local owners: { [number]: Player? } = {}
local plotOf: { [Player]: number } = {}
local unlocked: { [string]: boolean } = {}
local dropFolder: Folder? = nil

local function config(part: Instance): any
	local entry = MapData.parts[part.Name]
	return (entry and entry.data) or {}
end

local function plotParts(tag: string, index: number): { BasePart }
	local found = {}
	for _, part in ipairs(CollectionService:GetTagged(tag)) do
		if part:IsA("BasePart") and config(part).plot == index then
			table.insert(found, part)
		end
	end
	return found
end

local function ownerOf(index: number): Player?
	local player = owners[index]
	if player and player.Parent then
		return player
	end
	return nil
end

local function claim(player: Player)
	for _, plot in ipairs(CollectionService:GetTagged("ForgePlot")) do
		local index = config(plot).index or 1
		if not ownerOf(index) then
			owners[index] = player
			plotOf[player] = index
			Economy.notify(player, string.format("Plot %d is yours", index), "good")

			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if root and root:IsA("BasePart") and plot:IsA("BasePart") then
				root.CFrame = plot.CFrame + Vector3.new(0, plot.Size.Y / 2 + 5, 0)
			end
			return
		end
	end
	Economy.notify(player, "Every plot is taken -- you are a guest this round", "warn")
end

local function release(player: Player)
	local index = plotOf[player]
	if index then
		owners[index] = nil
		plotOf[player] = nil
		-- A vacated plot resets so the next owner starts fresh.
		for _, dropper in ipairs(plotParts("ForgeDropper", index)) do
			unlocked[dropper.Name] = nil
		end
	end
end

local function spawnDrop(dropper: BasePart)
	local settings = config(dropper)
	if settings.locked and not unlocked[dropper.Name] then
		return
	end
	local index = settings.plot or 1
	if not ownerOf(index) then
		return
	end

	local drop = Instance.new("Part")
	drop.Name = "Drop"
	drop.Size = Vector3.new(1.4, 1.4, 1.4)
	drop.Color = dropper.Color
	drop.Material = Enum.Material.Neon
	drop.TopSurface = Enum.SurfaceType.Smooth
	drop.BottomSurface = Enum.SurfaceType.Smooth
	drop.CFrame = dropper.CFrame - Vector3.new(0, dropper.Size.Y / 2 + 1, 0)
	drop:SetAttribute("Value", settings.value or 2)
	drop:SetAttribute("Plot", index)
	drop.Parent = dropFolder
	Debris:AddItem(drop, settings.lifetime or 25)
end

local function collect(collector: BasePart)
	local index = config(collector).plot or 1
	collector.Touched:Connect(function(hit)
		if hit.Name ~= "Drop" or hit:GetAttribute("Plot") ~= index then
			return
		end
		local player = ownerOf(index)
		local value = hit:GetAttribute("Value") or 1
		hit:Destroy()
		if player then
			Economy.award(player, value)
		end
	end)
end

local function buyButton(button: BasePart)
	local settings = config(button)
	local index = settings.plot or 1
	local label = settings.unlocks

	button.Touched:Connect(function(hit)
		local character = hit.Parent
		local player = character and Players:GetPlayerFromCharacter(character)
		if not player or plotOf[player] ~= index then
			return
		end
		if label and unlocked[label] then
			return
		end
		if not Economy.spend(player, settings.cost or 100) then
			Economy.notify(player, string.format("Costs %d %s", settings.cost or 100, Settings.currency.name), "warn")
			return
		end

		if label then
			unlocked[label] = true
			local profile = Save.get(player)
			profile.purchases = profile.purchases or {}
			profile.purchases[label] = true
		end
		Economy.notify(player, string.format("Unlocked %s", label or "upgrade"), "good")
		button.Transparency = 0.7
		button.CanTouch = false
	end)
end

function Plots.start()
	dropFolder = workspace:FindFirstChild("Drops") :: Folder?
	if not dropFolder then
		local folder = Instance.new("Folder")
		folder.Name = "Drops"
		folder.Parent = workspace
		dropFolder = folder
	end

	for _, collector in ipairs(CollectionService:GetTagged("ForgeCollector")) do
		if collector:IsA("BasePart") then
			collect(collector)
		end
	end
	for _, button in ipairs(CollectionService:GetTagged("ForgeBuy")) do
		if button:IsA("BasePart") then
			buyButton(button)
		end
	end

	for _, player in ipairs(Players:GetPlayers()) do
		task.spawn(claim, player)
	end
	Players.PlayerAdded:Connect(function(player)
		player.CharacterAdded:Wait()
		claim(player)
	end)
	Players.PlayerRemoving:Connect(release)

	-- Droppers each run on their own cadence.
	for _, dropper in ipairs(CollectionService:GetTagged("ForgeDropper")) do
		if dropper:IsA("BasePart") then
			local interval = config(dropper).interval or 2
			task.spawn(function()
				while dropper.Parent do
					task.wait(interval)
					spawnDrop(dropper)
				end
			end)
		end
	end
end

-- Re-exported so other systems can ask who owns what.
Plots.ownerOf = ownerOf
Plots.plotOf = function(player: Player): number?
	return plotOf[player]
end

return Plots
