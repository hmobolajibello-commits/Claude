--!strict
-- Server-authoritative shop. The client can only ask to buy an id; price,
-- affordability and the effect are all decided here.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local Net = require(Shared:WaitForChild("Net"))
local Save = require(script.Parent:WaitForChild("Save"))
local Economy = require(script.Parent:WaitForChild("Economy"))

local Shop = {}

local items = (Settings.shop and Settings.shop.items) or {}

local function itemById(id: string)
	for _, item in ipairs(items) do
		if item.id == id then
			return item
		end
	end
	return nil
end

-- Re-apply everything the player already owns to a fresh character.
local function applyOwned(player: Player)
	local profile = Save.get(player)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid then
		return
	end

	local walkBonus, jumpBonus = 0, 0
	for id, owned in pairs(profile.purchases or {}) do
		if owned then
			local item = itemById(id)
			if item then
				if item.kind == "speed" then
					walkBonus += item.value
				elseif item.kind == "jump" then
					jumpBonus += item.value
				end
			end
		end
	end

	humanoid.WalkSpeed = 16 + walkBonus
	humanoid.JumpPower = 50 + jumpBonus
	humanoid.UseJumpPower = true
end

Shop.applyOwned = applyOwned

function Shop.buy(player: Player, id: string): (boolean, string)
	local item = itemById(id)
	if not item then
		return false, "That item does not exist."
	end

	local profile = Save.get(player)
	profile.purchases = profile.purchases or {}

	if item.repeatable ~= true and profile.purchases[id] then
		return false, "You already own that."
	end
	if not Economy.spend(player, item.price) then
		return false, string.format("You need %d %s.", item.price, Settings.currency.name)
	end

	if item.kind == "multiplier" then
		profile.multiplier = (profile.multiplier or 1) + item.value
	elseif item.kind == "capacity" then
		profile.capacity = (profile.capacity or (Settings.backpack and Settings.backpack.capacity) or 25) + item.value
	end

	profile.purchases[id] = true
	applyOwned(player)
	Economy.push(player)
	Economy.notify(player, string.format("Bought %s", item.name), "good")
	return true, "Purchased"
end

function Shop.start()
	local buyFn = Net.fn("Buy")
	buyFn.OnServerInvoke = function(player: Player, id)
		if type(id) ~= "string" then
			return { ok = false, message = "Bad request" }
		end
		local ok, message = Shop.buy(player, id)
		return { ok = ok, message = message }
	end

	local function hook(player: Player)
		player.CharacterAdded:Connect(function()
			task.wait(0.3)
			applyOwned(player)
		end)
		if player.Character then
			applyOwned(player)
		end
	end

	for _, player in ipairs(Players:GetPlayers()) do
		hook(player)
	end
	Players.PlayerAdded:Connect(hook)
end

return Shop
