-- game/screens/logo.lua
-- Coordinate Games logo animation screen
--
-- SEQUENCE: 9 isometric tiles fly in one at a time from different screen
-- edges, assembling into a 3×3 diamond grid. A white circle drops in and
-- bounces on the center tile. "COORDINATE GAMES" text bounces up from below.
-- Hold, then ball flies up and grid+text drop out. Press A or B to skip.

local gfx <const> = playdate.graphics
local pd <const> = playdate

local LogoScreen = {}
LogoScreen.__index = LogoScreen

-- ============================================================================
-- CONFIG — tweak everything here
-- ============================================================================

local CONFIG = {
    -- Vertical nudge: positive = whole composition moves down the screen
    offsetY = 40,

    -- Tile geometry
    tileHalfW = 46,
    tileHalfH = 23,
    tileLine = 3,

    -- Grid center (before offsetY)
    gridX = 200,
    gridY = 85,

    -- Circle
    circleR = 14,
    circleLine = 3,
    circleBaseY = 71,       -- resting Y relative to grid center tile

    -- Text
    textFinalY = 150,       -- relative to screen (offsetY applied)
    textStartY = 300,       -- off-screen start position (bottom)

    -- Timing (ms)
    firstTileDelay = 300,   -- pause before first tile
    tileStagger = 130,      -- gap between each tile start
    tileDuration = 350,     -- each tile's fly-in time
    circleDelay = 250,      -- pause after last tile lands
    circleDuration = 1400,  -- outBounce drop + settle
    textDelay = 1000,       -- after circle starts falling
    textDuration = 700,     -- outBounce slide-up time
    holdTime = 1000,        -- hold completed logo
    exitDuration = 300,     -- exit animation time
    exitHold = 400,         -- black screen hold after exit before transition
}

-- ============================================================================
-- CONSTRUCTOR
-- ============================================================================

function LogoScreen:new()
    local self = setmetatable({}, LogoScreen)

    self.screenWidth = pd.display.getWidth()
    self.screenHeight = pd.display.getHeight()

    self.isExiting = false
    self.sceneToTransitionTo = nil

    -- Tile state
    self.tiles = {}
    self:_buildTiles()

    -- Circle state
    self.circleX = CONFIG.gridX
    self.circleY = -30
    self.circleVisible = false

    -- Text state
    self.textY = CONFIG.textStartY
    self.textVisible = false

    -- Exit offsets — each element exits in its own direction
    self.circleExitY = 0
    self.gridExitY = 0
    self.textExitY = 0

    return self
end

-- ============================================================================
-- TILE SETUP
-- ============================================================================

function LogoScreen:_buildTiles()
    local oy = CONFIG.offsetY
    local defs = {
        {0, 0, "top"},       -- 1: top of diamond
        {0, 1, "right"},     -- 2: upper-right
        {0, 2, "right"},     -- 3: right point
        {1, 2, "right"},     -- 4: lower-right
        {2, 2, "bottom"},    -- 5: bottom of diamond
        {2, 1, "bottom"},    -- 6: lower-left
        {2, 0, "left"},      -- 7: left point
        {1, 0, "left"},      -- 8: upper-left
        {1, 1, "top"},       -- 9: center (drops from above)
    }

    for i, def in ipairs(defs) do
        local r, c, dir = def[1], def[2], def[3]
        local dx = c - 1
        local dy = r - 1
        local targetX = CONFIG.gridX + (dx - dy) * CONFIG.tileHalfW
        local targetY = CONFIG.gridY + (dx + dy) * CONFIG.tileHalfH + oy

        local startX, startY = targetX, targetY
        if dir == "top" then
            startY = -50
        elseif dir == "bottom" then
            startY = 290
        elseif dir == "left" then
            startX = -80
        elseif dir == "right" then
            startX = 460
        end

        self.tiles[i] = {
            x = startX,
            y = startY,
            targetX = targetX,
            targetY = targetY,
            visible = false,
        }
    end
end

-- ============================================================================
-- LIFECYCLE
-- ============================================================================

function LogoScreen:enter()
    local C = CONFIG

    -- Stagger tile fly-ins
    for i, tile in ipairs(self.tiles) do
        local delay = C.firstTileDelay + (i - 1) * C.tileStagger

        pd.timer.performAfterDelay(delay, function()
            tile.visible = true

            if tile.x ~= tile.targetX then
                local ax = pd.timer.new(C.tileDuration, tile.x, tile.targetX, pd.easingFunctions.outCubic)
                ax.updateCallback = function(t) tile.x = t.value end
            end
            if tile.y ~= tile.targetY then
                local ay = pd.timer.new(C.tileDuration, tile.y, tile.targetY, pd.easingFunctions.outCubic)
                ay.updateCallback = function(t) tile.y = t.value end
            end
        end)
    end

    -- Circle drops onto center tile after last tile lands
    local lastTileArrival = C.firstTileDelay + (#self.tiles - 1) * C.tileStagger + C.tileDuration
    local circleStart = lastTileArrival + C.circleDelay
    local circleTarget = C.circleBaseY + C.offsetY

    pd.timer.performAfterDelay(circleStart, function()
        self.circleVisible = true
        local ac = pd.timer.new(C.circleDuration, -30, circleTarget, pd.easingFunctions.outBounce)
        ac.updateCallback = function(t) self.circleY = t.value end
    end)

    -- Text bounces up from below
    local textStart = circleStart + C.textDelay
    local textTarget = C.textFinalY + C.offsetY

    pd.timer.performAfterDelay(textStart, function()
        self.textVisible = true
        local at = pd.timer.new(C.textDuration, C.textStartY, textTarget, pd.easingFunctions.outBounce)
        at.updateCallback = function(t) self.textY = t.value end
    end)

    -- Hold, then exit — timed from when text finishes arriving
    local textFinished = textStart + C.textDuration
    local exitStart = textFinished + C.holdTime

    pd.timer.performAfterDelay(exitStart, function()
        if not self.isExiting then
            self:_startExit()
        end
    end)
end

function LogoScreen:update()
    if self.sceneToTransitionTo then
        return self.sceneToTransitionTo
    end

    -- A or B triggers exit (not instant skip)
    if not self.isExiting then
        local Input = Engine.Input
        if Input.pressed(Input.A) or Input.pressed(Input.B) then
            self:_startExit()
        end
    end

    return nil
end

function LogoScreen:_startExit()
    self.isExiting = true

    local C = CONFIG

    -- Circle flies back up
    local circleExit = pd.timer.new(C.exitDuration, 0, -300, pd.easingFunctions.inCubic)
    circleExit.updateCallback = function(t) self.circleExitY = t.value end

    -- Grid and text drop down together
    local boardExit = pd.timer.new(C.exitDuration, 0, 300, pd.easingFunctions.inCubic)
    boardExit.updateCallback = function(t)
        self.gridExitY = t.value
        self.textExitY = t.value
    end
    boardExit.timerEndedCallback = function()
        pd.timer.performAfterDelay(C.exitHold, function()
            self.sceneToTransitionTo = "start"
        end)
    end
end

function LogoScreen:exit()
end

-- ============================================================================
-- DRAWING
-- ============================================================================

function LogoScreen:draw()
    gfx.clear(gfx.kColorBlack)

    -- Tiles
    gfx.setLineWidth(CONFIG.tileLine)
    for _, tile in ipairs(self.tiles) do
        if tile.visible then
            self:_drawTile(tile.x, tile.y + self.gridExitY)
        end
    end

    -- Circle
    if self.circleVisible then
        local cy = self.circleY + self.circleExitY

        gfx.setColor(gfx.kColorWhite)
        gfx.fillCircleAtPoint(self.circleX, cy, CONFIG.circleR)
        gfx.setColor(gfx.kColorBlack)
        gfx.setLineWidth(CONFIG.circleLine)
        gfx.drawCircleAtPoint(self.circleX, cy, CONFIG.circleR)
    end

    -- Text
    if self.textVisible then
        gfx.setImageDrawMode(gfx.kDrawModeFillWhite)
        gfx.drawTextAligned("*coordinate games*", self.screenWidth / 2, self.textY + self.textExitY, kTextAlignment.center)
        gfx.setImageDrawMode(gfx.kDrawModeCopy)
    end
end

function LogoScreen:_drawTile(cx, cy)
    local hw = CONFIG.tileHalfW
    local hh = CONFIG.tileHalfH

    gfx.setColor(gfx.kColorWhite)
    gfx.fillPolygon(cx, cy - hh, cx + hw, cy, cx, cy + hh, cx - hw, cy)

    gfx.setColor(gfx.kColorBlack)
    gfx.drawLine(cx, cy - hh, cx + hw, cy)
    gfx.drawLine(cx + hw, cy, cx, cy + hh)
    gfx.drawLine(cx, cy + hh, cx - hw, cy)
    gfx.drawLine(cx - hw, cy, cx, cy - hh)
end

return LogoScreen
